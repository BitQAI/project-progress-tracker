'use client';

import React from 'react';
import { FileAttachment, AttachmentType } from '@/lib/types';
import { Image as ImageIcon, FileCode, FileText, Eye, Trash2 } from 'lucide-react';

export function getAttachmentFormatIcon(type: AttachmentType, className: string = 'h-3.5 w-3.5') {
  switch (type) {
    case 'image':
      return <ImageIcon className={`${className} text-sky-500`} />;
    case 'md':
      return <FileCode className={`${className} text-emerald-500`} />;
    case 'pdf':
      return <FileText className={`${className} text-rose-500`} />;
    default:
      return <FileText className={`${className} text-zinc-500`} />;
  }
}

export function formatAttachmentSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentBadgeListProps {
  attachments: FileAttachment[];
  onPreview: (att: FileAttachment, list: FileAttachment[]) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

export function AttachmentBadgeList({
  attachments,
  onPreview,
  onRemove,
  className = '',
}: AttachmentBadgeListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {attachments.map((att) => (
        <div
          key={att.id || att.url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-xs text-zinc-800 shadow-2xs group transition-all text-left"
        >
          <span className="shrink-0">{getAttachmentFormatIcon(att.type)}</span>
          <span className="font-medium truncate max-w-[140px] group-hover:text-zinc-900">
            {att.name}
          </span>
          {att.size && (
            <span className="text-3xs text-zinc-400 shrink-0">
              {formatAttachmentSize(att.size)}
            </span>
          )}
          <button
            type="button"
            onClick={() => onPreview(att, attachments)}
            className="text-zinc-400 hover:text-emerald-600 ml-0.5 cursor-pointer"
            title="在线预览"
          >
            <Eye className="h-3 w-3" />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(att.id)}
              className="text-zinc-400 hover:text-rose-600 ml-0.5 cursor-pointer"
              title="移除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
