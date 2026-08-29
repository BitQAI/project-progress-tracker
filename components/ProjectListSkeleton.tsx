'use client';

import React from 'react';

export function ProjectListSkeleton() {
  return (
    <div>
      {/* 移动端骨架屏 */}
      <div className="block md:hidden divide-y divide-zinc-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3.5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-40 bg-zinc-200 rounded"></div>
              <div className="h-5 w-16 bg-zinc-200 rounded-full"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 bg-zinc-200 rounded"></div>
              <div className="h-4 w-16 bg-zinc-200 rounded"></div>
              <div className="h-4 w-14 bg-zinc-200 rounded"></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-8 bg-zinc-200 rounded"></div>
                <div className="h-3 w-12 bg-zinc-200 rounded"></div>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-200 rounded-full w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 桌面端骨架屏表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5">项目名称</th>
              <th className="px-3 py-2.5">优先级</th>
              <th className="px-3 py-2.5">负责人</th>
              <th className="px-3 py-2.5 min-w-[180px]">进度 (递归汇总)</th>
              <th className="px-3 py-2.5">状态</th>
              <th className="px-3 py-2.5">计划截止日</th>
              <th className="px-4 py-2.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-zinc-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-44 bg-zinc-200 rounded"></div>
                    <div className="h-4 w-12 bg-zinc-100 rounded"></div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 w-10 bg-zinc-200 rounded"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 w-12 bg-zinc-200 rounded"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-1.5 w-36">
                    <div className="flex justify-between">
                      <div className="h-3 w-6 bg-zinc-200 rounded"></div>
                      <div className="h-3 w-10 bg-zinc-200 rounded"></div>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full">
                      <div className="h-full bg-zinc-200 rounded-full w-1/2"></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-5 w-16 bg-zinc-200 rounded-full"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 w-20 bg-zinc-200 rounded"></div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1.5 justify-end">
                    <div className="h-6 w-12 bg-zinc-200 rounded"></div>
                    <div className="h-6 w-6 bg-zinc-200 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
