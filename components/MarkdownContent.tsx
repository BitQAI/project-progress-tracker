'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownContentProps {
  content?: string;
  className?: string;
  maxLines?: number;
}

export function MarkdownContent({
  content = '',
  className = '',
}: MarkdownContentProps) {
  if (!content || !content.trim()) return null;

  return (
    <div className={`prose-sm max-w-none text-inherit leading-relaxed break-words font-sans ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0 whitespace-pre-wrap leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-1.5 space-y-0.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-1.5 space-y-0.5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="text-inherit leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-800">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-300 pl-2.5 my-1 text-zinc-500 italic">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] font-mono text-zinc-800 border border-zinc-200/60">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="rounded-lg bg-zinc-900 text-zinc-100 p-2.5 my-1.5 text-xs font-mono overflow-x-auto">
              {children}
            </pre>
          ),
          h1: ({ children }) => <h1 className="text-sm font-bold text-zinc-900 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-bold text-zinc-900 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-zinc-900 mb-0.5">{children}</h3>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
