'use client';

import React, { useState, useMemo } from 'react';
import { FileAttachment } from '@/lib/types';
import {
  FileText,
  Presentation,
  Download,
  ExternalLink,
  Eye,
  CheckCircle2,
  Calendar,
  HardDrive,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface OfficeDocumentPreviewProps {
  attachment: FileAttachment;
  formatFileSize: (bytes?: number) => string;
}

export function OfficeDocumentPreview({
  attachment,
  formatFileSize,
}: OfficeDocumentPreviewProps) {
  const isWord = attachment.type === 'word';
  const isPpt = attachment.type === 'ppt';

  // 检测是否为公网可访问的 HTTP/HTTPS 地址（非 localhost/私有地址/data URL）
  const isPublicHttpUrl = useMemo(() => {
    if (!attachment.url) return false;
    if (attachment.url.startsWith('data:') || attachment.url.startsWith('blob:')) return false;
    if (attachment.url.startsWith('/uploads/') || attachment.url.startsWith('/')) return false;
    try {
      const parsed = new URL(attachment.url);
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
        return false;
      }
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, [attachment.url]);

  // 默认模式：如果是公网则进入 Office 在线阅览，如果是本地/内网则展示成果档案卡
  const [activeTab, setActiveTab] = useState<'card' | 'online'>(
    isPublicHttpUrl ? 'online' : 'card'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 构造微软 Office Web Viewer 嵌入地址
  const officeOnlineEmbedUrl = useMemo(() => {
    if (!attachment.url) return '';
    const fullUrl = attachment.url.startsWith('http')
      ? attachment.url
      : typeof window !== 'undefined'
      ? `${window.location.origin}${attachment.url}`
      : attachment.url;
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fullUrl)}`;
  }, [attachment.url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(attachment.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Copy URL error:', err);
    }
  };

  const docTypeName = isWord ? 'Microsoft Word 文档' : 'PowerPoint 演示文稿';
  const docExtHint = isWord ? '.docx / .doc' : '.pptx / .ppt';

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100">
      {/* 顶部模式切换导航条 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-white shadow-2xs ${
              isWord ? 'bg-blue-600' : 'bg-orange-600'
            }`}
          >
            {isWord ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <Presentation className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-semibold text-zinc-800">{docTypeName}</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-3xs text-zinc-500 font-mono">
            {docExtHint}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
              activeTab === 'card'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            交付档案卡
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
              activeTab === 'online'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>微软云端阅览</span>
          </button>
        </div>
      </div>

      {/* 视图内容区 */}
      <div className="flex-1 min-h-0 relative overflow-auto">
        {activeTab === 'online' ? (
          <div className="w-full h-full flex flex-col bg-zinc-900">
            {!isPublicHttpUrl && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    当前附件存储于本地或私有环境，微软云端预览服务器需公网可达；若加载失败请切换为「交付档案卡」并直接下载。
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-3xs shrink-0 font-medium ml-2 cursor-pointer"
                >
                  切回档案卡
                </button>
              </div>
            )}
            <iframe
              src={officeOnlineEmbedUrl}
              title={attachment.name}
              className="w-full flex-1 border-0 bg-white"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* 大图标与标题 */}
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm text-white ${
                    isWord
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                      : 'bg-gradient-to-br from-orange-500 to-orange-700'
                  }`}
                >
                  {isWord ? (
                    <FileText className="h-8 w-8" />
                  ) : (
                    <Presentation className="h-8 w-8" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isWord
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {docTypeName}
                    </span>
                    <span className="text-3xs text-zinc-400 font-mono">
                      {isWord ? 'Word Document' : 'Slide Deck'}
                    </span>
                  </div>
                  <h3
                    className="mt-1.5 text-base sm:text-lg font-bold text-zinc-900 break-all leading-snug"
                    title={attachment.name}
                  >
                    {attachment.name}
                  </h3>
                </div>
              </div>

              {/* 关键元数据列表 */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-150 text-xs">
                <div className="flex items-center gap-2 text-zinc-600">
                  <HardDrive className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <span className="text-3xs text-zinc-400 block">文件大小</span>
                    <span className="font-semibold text-zinc-800">
                      {formatFileSize(attachment.size) || '未知体积'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-600">
                  <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <span className="text-3xs text-zinc-400 block">归档状态</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 已安全留档
                    </span>
                  </div>
                </div>
              </div>

              {/* 核心操作按钮 */}
              <div className="space-y-2.5">
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer ${
                    isWord ? 'bg-blue-600' : 'bg-orange-600'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span>立即下载该文件 ({formatFileSize(attachment.size)})</span>
                </a>

                <div className="flex gap-2">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                    <span>新窗口打开</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
                  >
                    {copiedUrl ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                    <span>{copiedUrl ? '链接已复制' : '复制文件链接'}</span>
                  </button>
                </div>
              </div>

              {/* 查看指引与兼容性提示 */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-[11px] text-zinc-500 space-y-1">
                <div className="font-semibold text-zinc-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>办公套件协同说明</span>
                </div>
                <p className="leading-relaxed">
                  本成果支持在 Microsoft Office 365、WPS Office、金山文档及 Apple
                  Keynote/Pages 中直接打开与协同编辑。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
