'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileCode,
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
  const [mdContent, setMdContent] = useState<string>('');
  const [isLoadingMd, setIsLoadingMd] = useState<boolean>(isMd);
  const [mdLoadError, setMdLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 当附件为 Markdown 时，拉取文本内容
  useEffect(() => {
    let ignore = false;
    if (!isMd) return;

    async function loadMarkdown() {
      // 使用服务端代理以规避浏览器 CORS 跨域限制及沙箱网络隔离问题
      const fetchUrl = attachment.url.startsWith('data:')
        ? attachment.url
        : `/api/proxy?url=${encodeURIComponent(attachment.url)}`;

      const res = await safeFetchText(fetchUrl);
      if (!ignore) {
        if (res.ok && res.data !== undefined) {
          setMdContent(res.data);
          setIsLoadingMd(false);
        } else {
          console.error('Fetch markdown error:', res.error);
          setMdLoadError(res.error || '获取 Markdown 文件内容失败');
          setIsLoadingMd(false);
        }
      }
    }

    loadMarkdown();

    return () => {
      ignore = true;
    };
  }, [attachment.url, isMd]);

  const handleCopyMarkdown = async () => {
    if (!mdContent) return;
    try {
      await navigator.clipboard.writeText(mdContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy markdown error:', err);
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
            {attachment.type === 'md' && (
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
                  <span className="hidden sm:inline">渲染排版</span>
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
                  <span className="hidden sm:inline">原文源码</span>
                </button>
              </div>
            )}

            {attachment.type === 'md' && (
              <button
                type="button"
                onClick={handleCopyMarkdown}
                title="复制 Markdown 源码"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors shadow-2xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? '已复制' : '复制内容'}</span>
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
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-lg transition-colors hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition-colors ml-1"
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
              {isLoadingMd ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-sm">正在加载 Markdown 文档...</span>
                </div>
              ) : mdLoadError ? (
                <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 m-4">
                  <p className="font-semibold text-sm">加载文档失败</p>
                  <p className="text-xs mt-1 text-rose-500">{mdLoadError}</p>
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
                  {mdContent || '（空文档）'}
                </pre>
              ) : (
                <div className="markdown-body prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{mdContent || '（空文档）'}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* 3. PDF 内嵌查看 */}
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 transition-all ${
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
