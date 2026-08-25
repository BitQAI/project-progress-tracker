'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm max-w-md w-full space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 mx-auto">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">404 - 页面未找到</h2>
        <p className="text-xs text-zinc-500">
          您访问的项目页面或路由不存在，可能已被移动或删除。
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回项目总览</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
