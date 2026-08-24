'use client';

import React, { useState, useEffect, use } from 'react';
import { NodeTreeNode } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { ProjectTree } from '@/components/ProjectTree';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useRouter } from 'next/navigation';
import { safeFetchJson } from '@/lib/fetch-utils';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [tree, setTree] = useState<NodeTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadTree() {
      try {
        const res = await safeFetchJson(`/api/projects/${params.id}`);
        if (!ignore) {
          if (!res.ok || !res.data?.ok || !res.data?.data) {
            setError(res.error || res.data?.error || '未找到项目数据');
          } else {
            setTree(res.data.data);
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || '加载项目失败');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadTree();
    return () => {
      ignore = true;
    };
  }, [params.id, refreshCount]);

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900">
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-xs text-zinc-500">正在构建项目递归树与计算进度指标...</p>
          </div>
        ) : error || !tree ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <h2 className="text-base font-bold text-red-900">加载项目失败</h2>
            <p className="text-xs text-red-600">{error || '项目不存在或已被删除'}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回仪表盘</span>
            </Link>
          </div>
        ) : (
          <ProjectTree initialTree={tree} onRefresh={() => setRefreshCount((c) => c + 1)} />
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(id) => router.push(`/projects/${id}`)}
      />
    </div>
  );
}
