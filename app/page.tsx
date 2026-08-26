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
import { safeFetchJson } from '@/lib/fetch-utils';
import { RefreshCw, Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [executiveActivities, setExecutiveActivities] = useState<ExecutiveActivityItem[]>([]);
  const [allActivities, setAllActivities] = useState<ExecutiveActivityItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    averageProgress: 0,
    activeProjectsCount: 0,
    inProgressCount: 0,
    doneCount: 0,
    unstartedCount: 0,
    suspendedCount: 0,
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
        const res = await safeFetchJson('/api/projects');
        if (!ignore && res.ok && res.data?.ok && res.data?.data) {
          setProjects(res.data.data.summaries);
          setMetrics(res.data.data.metrics);
          if (Array.isArray(res.data.data.executiveActivities)) {
            setExecutiveActivities(res.data.data.executiveActivities);
          }
          if (Array.isArray(res.data.data.allActivities)) {
            setAllActivities(res.data.data.allActivities);
          }
        }
      } catch (err) {
        console.warn('Fetch dashboard warn:', err);
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
      const res = await safeFetchJson(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
      if (res.ok && res.data?.ok) {
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
      const res = await safeFetchJson(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && res.data?.ok) {
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
      <Navbar 
        onOpenCreateModal={() => setIsCreateModalOpen(true)} 
        onRefresh={() => {
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }}
        isLoading={isLoading}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* 管理层最新 3 条关键进展速报（站在老板理解视角，不含 +/- 代码符号） */}
        <ExecutiveRecentActivities 
          activities={executiveActivities} 
          allActivities={allActivities.length > 0 ? allActivities : executiveActivities}
        />

        {/* 顶部汇总指标 */}
        <DashboardSummary metrics={metrics} />

        {/* 项目表格 */}
        <ProjectListTable
          projects={projects}
          onDeleteProject={handleDeleteClick}
          onStatusChange={handleStatusChange}
          isLoading={isLoading}
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
