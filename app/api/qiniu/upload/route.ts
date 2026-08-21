import { NextRequest, NextResponse } from 'next/server';
import qiniu from 'qiniu';

export async function POST(req: NextRequest) {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY || 'K2O9yO0C6cImQqFt1rD09vjiglk2fgj-Z2VkAgXY';
    const secretKey = process.env.QINIU_SECRET_KEY || '0-uaz4SODbMp6Y2BcbYDVKaAM889mRw8I791Gh9B';
    const bucket = process.env.QINIU_BUCKET || 'bitqai';
    const domain = process.env.QINIU_DOMAIN || 'files.bitqai.com';

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { ok: false, error: '服务器未配置七牛云存储凭证(ACCESS_KEY/SECRET_KEY)' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: '请选择要上传的图片' }, { status: 400 });
    }

    // 1. 安全检查：只允许常见图片格式
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: `不支持的文件格式: ${file.type}，请上传常见的图片(PNG/JPG/GIF/WEBP)` },
        { status: 400 }
      );
    }

    // 2. 大小检查：最大 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ ok: false, error: '图片过大，请上传小于 5MB 的图片' }, { status: 400 });
    }

    // 3. 构造唯一的七牛 Key (文件名) - 放在 protrack/ 文件夹下面
    const fileExt = file.name.split('.').pop() || 'jpg';
    const randId = Math.random().toString(36).substring(2, 7);
    const key = `protrack/cmt_${Date.now()}_${randId}.${fileExt}`;

    // 4. 使用官方 SDK 生成上传 Token
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const options = {
      scope: `${bucket}:${key}`,
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时失效
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(mac);

    // 5. 将 File 转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. 使用官方 SDK 的 FormUploader 上传 Buffer
    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    console.log(`[Qiniu SDK] 正在代理上传图片至 [${bucket}]: key=${key}, size=${file.size} 字节`);

    const uploadResult = await new Promise<{ key: string; hash: string }>((resolve, reject) => {
      formUploader.put(uploadToken, key, buffer, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          reject(respErr);
        } else if (respInfo.statusCode === 200) {
          resolve(respBody);
        } else {
          reject(new Error(`七牛上传状态错误 [${respInfo.statusCode}]: ${JSON.stringify(respBody)}`));
        }
      });
    });

    // 7. 返回拼接后的 CDN 公网访问路径
    const imageUrl = `https://${domain}/${key}`;
    console.log(`[Qiniu SDK] 图片上传成功！公网链接为: ${imageUrl}, hash=${uploadResult.hash}`);

    return NextResponse.json({
      ok: true,
      url: imageUrl,
      key,
    });
  } catch (error: any) {
    console.error('[Qiniu SDK] 上传接口出现异常:', error);
    return NextResponse.json({ ok: false, error: error.message || '服务端异常' }, { status: 500 });
  }
}
