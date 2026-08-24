'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProgressFlowCanvas } from '@/components/graph/ProgressFlowCanvas';
import { GraphFullData } from '@/lib/graph-service';
import { safeFetchJson } from '@/lib/fetch-utils';
import { Activity, RefreshCw } from 'lucide-react';

export default function ProgressGraphPage() {
  const [graphData, setGraphData] = useState<GraphFullData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const res = await safeFetchJson('/api/projects/graph');
        if (!ignore && res.ok && res.data?.ok && res.data?.data) {
          setGraphData(res.data.data);
        }
      } catch (err) {
        console.error('Fetch graph error:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 flex flex-col">
      <Navbar
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <main className="mx-auto flex-1 w-full max-w-[1700px] px-4 py-4 sm:px-6 lg:px-8 flex flex-col">
        {/* 页面标题说明 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
              <Activity className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 leading-tight">
                项目进度管理全景交互图
              </h1>
              <p className="text-xs text-zinc-500">
                以「项目进度管理」为根节点，纵览全局研发项目、子阶段及任务链路，支持实时勾选与多维筛选
              </p>
            </div>
          </div>
        </div>

        {/* 主体拓扑画布 */}
        {isLoading && !graphData ? (
          <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <RefreshCw className="h-7 w-7 animate-spin text-zinc-800" />
              <p className="text-sm font-medium">正在解析全景项目拓扑数据...</p>
            </div>
          </div>
        ) : graphData ? (
          <ProgressFlowCanvas
            initialData={graphData}
            onRefreshData={handleRefresh}
            isLoading={isLoading}
          />
        ) : (
          <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white">
            <p className="text-sm text-zinc-500">暂无项目拓扑数据</p>
          </div>
        )}
      </main>
    </div>
  );
}
