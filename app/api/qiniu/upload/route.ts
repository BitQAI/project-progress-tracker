import { NextRequest, NextResponse } from 'next/server';
import qiniu from 'qiniu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY || 'K2O9yO0C6cImQqFt1rD09vjiglk2fgj-Z2VkAgXY';
    const secretKey = process.env.QINIU_SECRET_KEY || '0-uaz4SODbMp6Y2BcbYDVKaAM889mRw8I791Gh9B';
    const bucket = process.env.QINIU_BUCKET || 'bitqai';
    const domain = process.env.QINIU_DOMAIN || 'files.bitqai.com';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: '请选择要上传的文件' }, { status: 400 });
    }

    // 1. 识别文件格式与归类 (图片 / Markdown / PDF)
    const originalName = file.name || 'attachment';
    const fileExt = (originalName.split('.').pop() || '').toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    let detectedType: 'image' | 'md' | 'pdf' = 'image';

    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const mdExts = ['md', 'markdown', 'txt'];
    const pdfExts = ['pdf'];

    if (
      mimeType.startsWith('image/') ||
      imageExts.includes(fileExt)
    ) {
      detectedType = 'image';
    } else if (
      mimeType === 'text/markdown' ||
      mimeType === 'text/x-markdown' ||
      mimeType === 'text/plain' ||
      mdExts.includes(fileExt)
    ) {
      detectedType = 'md';
    } else if (
      mimeType === 'application/pdf' ||
      pdfExts.includes(fileExt)
    ) {
      detectedType = 'pdf';
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: `不支持的文件格式 (${fileExt || mimeType})，支持格式：图片 (PNG/JPG/WEBP/GIF/SVG)、Markdown (.md)、PDF (.pdf)`,
        },
        { status: 400 }
      );
    }

    // 2. 大小检查：图片/MD 最大 10MB，PDF 最大 30MB
    const maxSizeBytes = detectedType === 'pdf' ? 30 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const maxMb = maxSizeBytes / (1024 * 1024);
      return NextResponse.json(
        { ok: false, error: `文件过大，当前格式最大支持 ${maxMb}MB` },
        { status: 400 }
      );
    }

    // 3. 构造唯一的七牛 Key (文件名) - 放在 protrack/ 文件夹下面
    const finalExt = fileExt || (detectedType === 'image' ? 'jpg' : detectedType === 'md' ? 'md' : 'pdf');
    const randId = Math.random().toString(36).substring(2, 7);
    const key = `protrack/att_${detectedType}_${Date.now()}_${randId}.${finalExt}`;

    // 4. 将 File 转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. 尝试上传到七牛云 (若未配置或云端网络不可达，自动启用内联数据容灾，保证预览与存储正常)
    let fileUrl = '';
    let isFallback = false;

    if (accessKey && secretKey && bucket) {
      try {
        const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        const options = {
          scope: `${bucket}:${key}`,
          deadline: Math.floor(Date.now() / 1000) + 3600,
        };
        const putPolicy = new qiniu.rs.PutPolicy(options);
        const uploadToken = putPolicy.uploadToken(mac);

        const config = new qiniu.conf.Config();
        const formUploader = new qiniu.form_up.FormUploader(config);
        const putExtra = new qiniu.form_up.PutExtra();

        // 6秒超时保护
        await Promise.race([
          new Promise<{ key: string; hash: string }>((resolve, reject) => {
            formUploader.put(uploadToken, key, buffer, putExtra, (respErr, respBody, respInfo) => {
              if (respErr) {
                reject(respErr);
              } else if (respInfo && respInfo.statusCode === 200) {
                resolve(respBody);
              } else {
                reject(new Error(`七牛上传状态错误: ${JSON.stringify(respBody)}`));
              }
            });
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('七牛上传网络响应超时')), 6000)),
        ]);

        fileUrl = `https://${domain}/${key}`;
        console.log(`[Qiniu SDK] 附件成功上传至七牛云: ${fileUrl}`);
      } catch (uploadErr) {
        console.warn('[Qiniu SDK] 七牛云上传遇到异常或网络超时，启用本地数据容灾支持:', uploadErr);
        isFallback = true;
      }
    } else {
      isFallback = true;
    }

    if (isFallback || !fileUrl) {
      const actualMime = mimeType || (detectedType === 'image' ? 'image/png' : detectedType === 'md' ? 'text/markdown' : 'application/pdf');
      const base64Str = buffer.toString('base64');
      fileUrl = `data:${actualMime};base64,${base64Str}`;
      console.log(`[Qiniu SDK] 已通过 DataURL 存储并支持即时在线预览 (${detectedType}, ${file.size} 字节)`);
    }

    return NextResponse.json({
      ok: true,
      url: fileUrl,
      key,
      name: originalName,
      type: detectedType,
      size: file.size,
      isFallback,
    });
  } catch (error: any) {
    console.error('[Qiniu SDK] 上传接口出现异常:', error);
    return NextResponse.json({ ok: false, error: error.message || '服务端异常' }, { status: 500 });
  }
}
