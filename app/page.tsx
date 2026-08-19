'use client';

import React, { useState, useEffect } from 'react';
import { ProjectSummary, DashboardMetrics, ProjectStatus, ExecutiveActivityItem } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { DashboardSummary } from '@/components/DashboardSummary';
import { ExecutiveRecentActivities } from '@/components/ExecutiveRecentActivities';
import { ProjectListTable } from '@/components/ProjectListTable';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [executiveActivities, setExecutiveActivities] = useState<ExecutiveActivityItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    averageProgress: 0,
    activeProjectsCount: 0,
    inProgressCount: 0,
    doneCount: 0,
    unstartedCount: 0,
    overdueProjectsCount: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    totalEarlyDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 删除确认弹窗状态
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (!ignore && data.ok && data.data) {
          setProjects(data.data.summaries);
          setMetrics(data.data.metrics);
          if (Array.isArray(data.data.executiveActivities)) {
            setExecutiveActivities(data.data.executiveActivities);
          }
        }
      } catch (err) {
        console.error('Fetch dashboard error:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleDeleteClick = (id: string, name: string) => {
    setProjectToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setProjectToDelete(null);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Delete project error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleCreateSuccess = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900">
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* 顶部标题栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              项目总览与执行监控
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              全景掌控项目进度与逾期状态，通过任务协作实时驱动全局项目交付进度
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setRefreshKey((k) => k + 1);
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 transition-all"
              title="刷新最新数据"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>

            <button
              id="dashboard-new-project-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>新建项目</span>
            </button>
          </div>
        </div>

        {/* 管理层最新 3 条关键进展速报（站在老板理解视角，不含 +/- 代码符号） */}
        <ExecutiveRecentActivities activities={executiveActivities} />

        {/* 顶部汇总指标 */}
        <DashboardSummary metrics={metrics} />

        {/* 项目表格 */}
        <ProjectListTable
          projects={projects}
          onDeleteProject={handleDeleteClick}
          onStatusChange={handleStatusChange}
        />
      </main>

      {/* 新建项目 Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* 删除项目确认 Modal */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="确认删除项目"
        message={`确定要删除项目「${projectToDelete?.name}」吗？此操作将递归清理该项目下的全部节点、任务与评论证据链记录，不可恢复。`}
        confirmText="确认彻底删除"
        cancelText="取消"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
