'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileCode,
  Globe,
  Copy,
  Check,
  Eye,
  Code2,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { safeFetchText } from '@/lib/fetch-utils';
import { FileAttachment, AttachmentType } from '@/lib/types';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: FileAttachment | null;
  /** 可选：传递附件列表以支持快捷切换上一份/下一份 */
  attachmentList?: FileAttachment[];
  onSelectAttachment?: (att: FileAttachment) => void;
}

export function AttachmentPreviewModal({
  isOpen,
  onClose,
  attachment,
  attachmentList,
  onSelectAttachment,
}: AttachmentPreviewModalProps) {
  if (!isOpen || !attachment) return null;

  return (
    <AttachmentPreviewModalContent
      key={attachment.id || attachment.url}
      attachment={attachment}
      attachmentList={attachmentList}
      onClose={onClose}
      onSelectAttachment={onSelectAttachment}
    />
  );
}

function AttachmentPreviewModalContent({
  attachment,
  attachmentList,
  onClose,
  onSelectAttachment,
}: {
  attachment: FileAttachment;
  attachmentList?: FileAttachment[];
  onClose: () => void;
  onSelectAttachment?: (att: FileAttachment) => void;
}) {
  const isMd = attachment.type === 'md';
  const isHtml = attachment.type === 'html';
  const isTextBased = isMd || isHtml;

  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState<boolean>(isTextBased);
  const [textLoadError, setTextLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 当附件为 Markdown 或 HTML 时，拉取文本源码
  useEffect(() => {
    let ignore = false;
    if (!isTextBased) return;

    async function loadTextContent() {
      // 使用服务端代理以规避浏览器 CORS 跨域限制及沙箱网络隔离问题
      const fetchUrl = attachment.url.startsWith('data:')
        ? attachment.url
        : `/api/proxy?url=${encodeURIComponent(attachment.url)}`;

      const res = await safeFetchText(fetchUrl);
      if (!ignore) {
        if (res.ok && res.data !== undefined) {
          setTextContent(res.data);
          setIsLoadingText(false);
        } else {
          console.error('Fetch attachment text error:', res.error);
          setTextLoadError(res.error || `获取 ${isHtml ? 'HTML' : 'Markdown'} 文件内容失败`);
          setIsLoadingText(false);
        }
      }
    }

    loadTextContent();

    return () => {
      ignore = true;
    };
  }, [attachment.url, isTextBased, isHtml]);

  const handleCopyContent = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy content error:', err);
    }
  };

  const getFormatIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-sky-500" />;
      case 'md':
        return <FileCode className="h-4 w-4 text-emerald-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-500" />;
      case 'html':
        return <Globe className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-zinc-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentIndex = attachmentList?.findIndex((a) => a.id === attachment.id || a.url === attachment.url) ?? -1;

  return (
    <div
      id="attachment-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="attachment-preview-modal-container"
        className={`flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 transition-all duration-200 ${
          isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-2xs">
              {getFormatIcon(attachment.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 text-sm truncate max-w-xs sm:max-w-md">
                  {attachment.name}
                </span>
                <span className="shrink-0 px-2 py-0.5 text-3xs font-medium rounded-full bg-zinc-200 text-zinc-700 uppercase tracking-wider">
                  {attachment.type}
                </span>
              </div>
              {attachment.size && (
                <p className="text-3xs text-zinc-500 mt-0.5">{formatFileSize(attachment.size)}</p>
              )}
            </div>
          </div>

          {/* 右侧工具操作组 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isTextBased && (
              <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-lg mr-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('rendered')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'rendered'
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isHtml ? '页面效果' : '渲染排版'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'raw'
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">源码查看</span>
                </button>
              </div>
            )}

            {isTextBased && (
              <button
                type="button"
                onClick={handleCopyContent}
                title={isHtml ? '复制 HTML 源码' : '复制 Markdown 源码'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? '已复制' : '复制源码'}</span>
              </button>
            )}

            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              title="在新标签页中打开"
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href={attachment.url}
              download={attachment.name}
              title="下载附件文件"
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? '退出全屏' : '全屏预览'}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-lg transition-colors hidden sm:block cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 预览主体区域 */}
        <div className="flex-1 min-h-0 bg-zinc-900/5 overflow-auto relative">
          {/* 1. 图片预览 */}
          {attachment.type === 'image' && (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4 bg-zinc-950/90 select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform duration-200"
              />
            </div>
          )}

          {/* 2. Markdown 渲染与源码查看 */}
          {attachment.type === 'md' && (
            <div className="w-full h-full bg-white overflow-auto p-4 sm:p-8">
              {isLoadingText ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-sm">正在加载 Markdown 文档...</span>
                </div>
              ) : textLoadError ? (
                <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 m-4">
                  <p className="font-semibold text-sm">加载文档失败</p>
                  <p className="text-xs mt-1 text-rose-500">{textLoadError}</p>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-rose-700 font-medium underline mt-3"
                  >
                    尝试直接在浏览器新标签打开 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : viewMode === 'raw' ? (
                <pre className="text-xs sm:text-sm font-mono text-zinc-800 bg-zinc-50 p-4 rounded-xl border border-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {textContent || '（空文档）'}
                </pre>
              ) : (
                <div className="markdown-body prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{textContent || '（空文档）'}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* 3. HTML 网页交互渲染与源码查看 */}
          {attachment.type === 'html' && (
            <div className="w-full h-full flex flex-col bg-white">
              {viewMode === 'raw' ? (
                <div className="w-full h-full overflow-auto p-4 sm:p-6 bg-zinc-900 text-zinc-100">
                  {isLoadingText ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                      <span className="text-sm">正在读取 HTML 源码...</span>
                    </div>
                  ) : textLoadError ? (
                    <div className="p-4 text-center text-rose-300 bg-rose-950/50 rounded-lg border border-rose-800">
                      <p className="text-sm font-medium">读取源码失败: {textLoadError}</p>
                    </div>
                  ) : (
                    <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed select-text">
                      {textContent || '<!-- 空 HTML 文档 -->'}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col relative bg-white">
                  <iframe
                    src={attachment.url}
                    srcDoc={attachment.url.startsWith('http') && !attachment.url.includes(window?.location?.host || '') ? undefined : (textContent || undefined)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    title={attachment.name}
                    className="w-full flex-1 border-0 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* 4. PDF 内嵌查看 */}
          {attachment.type === 'pdf' && (
            <div className="w-full h-full flex flex-col bg-zinc-800">
              <iframe
                src={`${attachment.url}#view=FitH`}
                title={attachment.name}
                className="w-full flex-1 border-0"
              />
            </div>
          )}
        </div>

        {/* 底部多附件切换条（若存在多个附件） */}
        {attachmentList && attachmentList.length > 1 && onSelectAttachment && (
          <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
              <span className="font-medium text-zinc-500 mr-1 shrink-0">
                附件清单 ({currentIndex + 1}/{attachmentList.length}):
              </span>
              {attachmentList.map((att, idx) => {
                const isActive = att.id === attachment.id || att.url === attachment.url;
                return (
                  <button
                    key={att.id || att.url || idx}
                    type="button"
                    onClick={() => onSelectAttachment(att)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {getFormatIcon(att.type)}
                    <span className="max-w-[120px] truncate">{att.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
