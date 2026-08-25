'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GraphFullData } from '@/lib/graph-service';
import { RootProgressNode } from './nodes/RootProgressNode';
import { ProjectFlowNode } from './nodes/ProjectFlowNode';
import { ModuleFlowNode } from './nodes/ModuleFlowNode';
import { TaskFlowNode } from './nodes/TaskFlowNode';
import { FlowControlsBar } from './FlowControlsBar';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import { buildFlowElements } from './flow-layout-utils';
import { GraphFilterState, LayoutDirection } from './types';
import { safeFetchJson } from '@/lib/fetch-utils';
import { AiTextParseModal } from '@/components/ai-parse/AiTextParseModal';

const nodeTypes = {
  rootNode: RootProgressNode,
  projectNode: ProjectFlowNode,
  moduleNode: ModuleFlowNode,
  taskNode: TaskFlowNode,
};

interface ProgressFlowCanvasProps {
  initialData: GraphFullData;
  onRefreshData?: () => Promise<void>;
  isLoading?: boolean;
}

function FlowInner({ initialData, onRefreshData, isLoading = false }: ProgressFlowCanvasProps) {
  const { fitView } = useReactFlow();

  // 1. 展开集合（包含已展开的 Project ID 与 Module ID）
  // 默认保持高层总览折叠状态，避免首屏几十个节点一并展开导致密集挤压
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // 如果只有 1-2 个项目，或者存在唯一进行中项目，可适度展开，否则默认只展示项目级拓扑
    if (initialData.projects.length <= 2) {
      initialData.projects.forEach((p) => set.add(p.id));
    }
    return set;
  });

  // 2. 布局方向
  const [direction, setDirection] = useState<LayoutDirection>('LR');

  // 3. 过滤状态
  const [filter, setFilter] = useState<GraphFilterState>({
    searchQuery: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    ownerFilter: '',
  });

  // 4. 选中的节点详情
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: 'root' | 'project' | 'module' | 'task';
    data: any;
    projectId?: string;
  } | null>(null);

  // 展开/收起单个节点
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 判断是否已展开全部
  const isAllExpanded = useMemo(() => {
    let totalExpandable = initialData.projects.length;
    let expandedCount = 0;
    const checkTree = (node: any) => {
      if (node.children?.length || node.tasks?.length) {
        totalExpandable++;
        if (expandedIds.has(node.id)) expandedCount++;
      }
      node.children?.forEach(checkTree);
    };
    initialData.projects.forEach((p) => {
      if (expandedIds.has(p.id)) expandedCount++;
      p.children?.forEach(checkTree);
    });
    return expandedCount >= totalExpandable;
  }, [initialData, expandedIds]);

  // 全部展开 / 全部收起
  const handleToggleAll = useCallback(() => {
    if (isAllExpanded) {
      setExpandedIds(new Set());
    } else {
      const next = new Set<string>();
      const addAll = (node: any) => {
        next.add(node.id);
        node.children?.forEach(addAll);
      };
      initialData.projects.forEach(addAll);
      setExpandedIds(next);
    }
  }, [isAllExpanded, initialData]);

  // 快速勾选/取消任务状态
  const handleToggleTask = useCallback(
    async (taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'done' ? 'pending' : 'done';
      try {
        const res = await safeFetchJson('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, status: newStatus }),
        });
        if (res.ok && res.data?.ok) {
          onRefreshData?.();
          // 如果当前侧边栏正好打开了这个任务，同步更新其状态
          if (selectedNode && selectedNode.type === 'task' && (selectedNode.data as any)?.id === taskId) {
            setSelectedNode((prev: any) => ({
              ...prev,
              data: { ...prev.data, status: newStatus },
            }));
          }
        }
      } catch (err) {
        console.error('Toggle task status error:', err);
      }
    },
    [onRefreshData, selectedNode]
  );

  // 节点选择
  const handleSelectNode = useCallback(
    (id: string, type: 'root' | 'project' | 'module' | 'task', data?: any, projectId?: string) => {
      setSelectedNode({ id, type, data, projectId });
    },
    []
  );

  // WBS AI 拆解状态
  const [aiParseContext, setAiParseContext] = useState<{
    projectId: string;
    type: 'project' | 'module' | 'task';
    data: any;
  } | null>(null);

  // 监听子组件或抽屉触发的 AI 智能拆解事件
  useEffect(() => {
    const handleTriggerAiParse = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setAiParseContext(detail);
      }
    };
    window.addEventListener('trigger-ai-parse', handleTriggerAiParse);
    return () => {
      window.removeEventListener('trigger-ai-parse', handleTriggerAiParse);
    };
  }, []);

  // 当外部刷新 WBS 数据时，自动同步已选节点的详细状态，保持侧边栏信息最新
  useEffect(() => {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;
    const nodeType = selectedNode.type;
    const projectCtxId = selectedNode.projectId;

    const findProjectAndNodes = () => {
      if (nodeType === 'project') {
        const found = initialData.projects.find((p) => p.id === nodeId);
        if (found && found !== selectedNode.data) {
          setSelectedNode({ id: nodeId, type: 'project', data: found, projectId: projectCtxId });
        }
      } else if (nodeType === 'module') {
        let foundModule: any = null;
        const searchTree = (node: any) => {
          if (node.id === nodeId) {
            foundModule = node;
            return;
          }
          node.children?.forEach(searchTree);
        };
        initialData.projects.forEach((p) => {
          searchTree(p);
        });
        if (foundModule && foundModule !== selectedNode.data) {
          setSelectedNode({ id: nodeId, type: 'module', data: foundModule, projectId: projectCtxId });
        }
      } else if (nodeType === 'task') {
        let foundTask: any = null;
        const searchTree = (node: any) => {
          const task = node.tasks?.find((t: any) => t.id === nodeId);
          if (task) {
            foundTask = task;
            return;
          }
          node.children?.forEach(searchTree);
        };
        initialData.projects.forEach((p) => {
          searchTree(p);
        });
        if (foundTask && foundTask !== selectedNode.data) {
          setSelectedNode({ id: nodeId, type: 'task', data: foundTask, projectId: projectCtxId });
        }
      }
    };

    findProjectAndNodes();
  }, [initialData, selectedNode]);

  // 构建拓扑元素
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return buildFlowElements({
      data: initialData,
      expandedIds,
      filter,
      direction,
      onToggleExpand: handleToggleExpand,
      onToggleAll: handleToggleAll,
      onToggleTask: handleToggleTask,
      onSelectNode: handleSelectNode,
      isAllExpanded,
    });
  }, [
    initialData,
    expandedIds,
    filter,
    direction,
    handleToggleExpand,
    handleToggleAll,
    handleToggleTask,
    handleSelectNode,
    isAllExpanded,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const isInitialMount = React.useRef(true);
  const prevDirectionRef = React.useRef<LayoutDirection>(direction);

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.25 });
  }, [fitView]);

  // 当布局元素变化时同步至画布。仅在首次挂载或布局方向切换时自动自适应，展开/折叠不重置用户缩放
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      const timer = setTimeout(() => {
        fitView({ duration: 400, padding: 0.25 });
      }, 60);
      return () => clearTimeout(timer);
    }

    if (prevDirectionRef.current !== direction) {
      prevDirectionRef.current = direction;
      const timer = setTimeout(() => {
        fitView({ duration: 400, padding: 0.25 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView, direction]);

  const handleReset = useCallback(() => {
    setFilter({
      searchQuery: '',
      statusFilter: 'all',
      priorityFilter: 'all',
      ownerFilter: '',
    });
    setExpandedIds(new Set<string>());
    onRefreshData?.();
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.25 });
    }, 150);
  }, [onRefreshData, fitView]);

  return (
    <div className="relative flex h-[calc(100vh-140px)] min-h-[600px] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 shadow-xs">
      {/* 顶部悬浮控制栏 */}
      <div className="p-3">
        <FlowControlsBar
          filter={filter}
          onFilterChange={(newF) => setFilter((prev) => ({ ...prev, ...newF }))}
          direction={direction}
          onDirectionChange={setDirection}
          isAllExpanded={isAllExpanded}
          onToggleAll={handleToggleAll}
          onFitView={handleFitView}
          onReset={handleReset}
          isLoading={isLoading}
          totalNodesCount={layoutedNodes.length}
        />
      </div>

      {/* React Flow 画布主体 */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.5 }}
          minZoom={0.15}
          maxZoom={2}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          className="bg-zinc-50/30"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d8" />
          <Controls className="!bg-white !border-zinc-200 !shadow-sm" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'rootNode') return '#18181b';
              if (n.type === 'projectNode') return '#3b82f6';
              if (n.type === 'moduleNode') return '#8b5cf6';
              return '#10b981';
            }}
            maskColor="rgba(244, 244, 245, 0.7)"
            className="!rounded-lg !border !border-zinc-200 !bg-white/90 !shadow-xs"
          />
        </ReactFlow>

        {/* 节点详情抽屉 */}
        <NodeDetailDrawer
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onToggleTask={handleToggleTask}
          onRefreshData={onRefreshData}
        />
      </div>

      {/* 智能 WBS 拆解弹窗 */}
      {aiParseContext && (
        <AiTextParseModal
          isOpen={true}
          projectId={aiParseContext.projectId}
          targetLevel={
            aiParseContext.type === 'project'
              ? 'project_subnodes'
              : aiParseContext.type === 'module'
              ? 'node_tasks'
              : 'task_subtasks'
          }
          targetNodeId={
            aiParseContext.type === 'module'
              ? aiParseContext.data.id
              : aiParseContext.type === 'task'
              ? aiParseContext.data.node_id
              : null
          }
          targetTaskId={aiParseContext.type === 'task' ? aiParseContext.data.id : null}
          contextName={aiParseContext.data.name}
          defaultOwner={aiParseContext.data.owner || ''}
          onClose={() => setAiParseContext(null)}
          onSuccess={async () => {
            if (onRefreshData) {
              await onRefreshData();
            }
            setAiParseContext(null);
          }}
        />
      )}
    </div>
  );
}

export function ProgressFlowCanvas(props: ProgressFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
