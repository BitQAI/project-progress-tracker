'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, Plus, Activity, RefreshCw, Network } from 'lucide-react';

interface NavbarProps {
  onOpenCreateModal?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Navbar({ onOpenCreateModal, onRefresh, isLoading = false }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            id="nav-logo-link"
            className="flex items-center gap-2.5 text-zinc-900 transition-colors hover:text-zinc-700"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-zinc-900 text-sm sm:text-base">项目进度管理系统</span>
              <span className="text-[10px] text-zinc-600 hidden sm:inline">Progress Tracker</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main Navigation">
            <Link
              href="/"
              id="nav-dashboard-link"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              仪表盘
            </Link>
            <Link
              href="/graph"
              id="nav-graph-link"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/graph'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Network className="h-4 w-4 text-emerald-600" />
              全景拓扑图
            </Link>
            <Link
              href="/templates"
              id="nav-templates-link"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/templates')
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              模板库
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/graph"
            id="nav-mobile-graph-link"
            className={`inline-flex sm:hidden items-center rounded-lg border p-2 ${
              pathname === '/graph'
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
            title="全景进度图"
          >
            <Network className="h-4 w-4" />
          </Link>

          <Link
            href="/templates"
            id="nav-mobile-templates-link"
            className="inline-flex sm:hidden items-center rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-50"
            title="模板管理"
          >
            <Layers className="h-4 w-4" />
          </Link>

          {/* 刷新数据按钮 */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 sm:px-3 transition-all"
              title="刷新最新数据"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          )}

          {/* 新增项目按钮 */}
          {onOpenCreateModal && (
            <button
              id="dashboard-new-project-btn"
              onClick={onOpenCreateModal}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 p-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 sm:px-3.5 transition-all"
              title="新增项目"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden sm:inline">新增项目</span>
            </button>
          )}

          {pathname !== '/' && (
            <Link
              href="/"
              id="nav-back-home-btn"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 sm:px-3.5 text-sm font-medium text-white shadow-xs transition-all hover:bg-zinc-800"
              title="返回所有项目仪表盘"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">返回仪表盘</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
