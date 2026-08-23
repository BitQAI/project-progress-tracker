'use client';

import React from 'react';
import { TrendingUp, Layers, ListTodo } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChatChartProps {
  type: 'trend' | 'projects' | 'tasks';
  statsData: any;
  isMounted: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#ef4444']; // 已完成, 进行中, 已逾期

export function ChatChart({ type, statsData, isMounted }: ChatChartProps) {
  if (!statsData) {
    return (
      <div className="h-36 w-full flex items-center justify-center text-[10px] text-zinc-400 bg-zinc-50/50 rounded-lg animate-pulse border border-dashed border-zinc-200 mt-2">
        正在同步系统实时趋势数据...
      </div>
    );
  }

  if (!isMounted) {
    return <div className="h-36 w-full bg-zinc-50 rounded-lg animate-pulse mt-2" />;
  }

  if (type === 'trend') {
    const data = statsData.trendData || [];
    return (
      <div className="mt-3.5 p-3.5 bg-zinc-50/50 border border-zinc-100 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
        <p className="text-[11px] font-semibold text-zinc-900 mb-2.5 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-zinc-600" />
          过去一周项目进度趋势 (累计 %)
        </p>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  fontSize: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              />
              <Line
                type="monotone"
                dataKey="进度"
                stroke="#18181b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#18181b' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'projects') {
    const data = statsData.projectProgressData || [];
    return (
      <div className="mt-3.5 p-3.5 bg-zinc-50/50 border border-zinc-100 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
        <p className="text-[11px] font-semibold text-zinc-900 mb-2.5 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-zinc-600" />
          各个项目当前完成进度百分比 (%)
        </p>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  fontSize: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              />
              <Bar dataKey="进度" fill="#27272a" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'tasks') {
    const taskData = statsData.taskStatusData || [];
    const metrics = statsData.metrics || {};
    const totalTasks =
      (metrics.completedTasksCount || 0) +
      (metrics.pendingTasksCount || 0) +
      (metrics.overdueTasksCount || 0);

    return (
      <div className="mt-3.5 p-3.5 bg-zinc-50/50 border border-zinc-100 rounded-xl flex flex-col items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
        <p className="text-[11px] font-semibold text-zinc-900 mb-1.5 w-full text-left flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5 text-zinc-600" />
          系统任务完成状态比例分布 (个)
        </p>
        <div className="h-32 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={taskData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={45}
                paddingAngle={3}
                dataKey="value"
              >
                {taskData.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  fontSize: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[12px] font-bold text-zinc-900">{totalTasks}</span>
            <span className="text-[8px] text-zinc-400 font-medium">总任务</span>
          </div>
        </div>
        <div className="flex gap-4 mt-1.5 justify-center w-full">
          {taskData.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <span>
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
