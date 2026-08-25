'use client';

import React, { useState } from 'react';
import {
  WbsParseTargetLevel,
  ParsedDraftNode,
  ParsedDraftTask,
  BatchImportPayload,
} from '@/lib/ai-wbs-types';
import { DraftNodesEditor } from './DraftNodesEditor';
import { DraftTasksEditor } from './DraftTasksEditor';
import { DraftPreviewTree } from './DraftPreviewTree';
import {
  Bot,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Layers,
  CheckSquare,
  Eye,
  Edit3,
} from 'lucide-react';

interface AiTextParseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  targetLevel: WbsParseTargetLevel;
  targetNodeId?: string | null;
  targetTaskId?: string | null;
  contextName: string;
  defaultOwner: string;
  onSuccess: () => void;
}

const PRESET_TEMPLATES: Record<WbsParseTargetLevel, { title: string; text: string }[]> = {
  project_subnodes: [
    {
      title: '敏捷研发全流程拆解',
      text: '请拆解为4个核心阶段模块：1. 需求与交互设计阶段（由产品经理负责，2周，需交付PRD与原型规范）；2. 后端高可用API开发（由技术组长负责，3周，需交付接口Swagger文档与单元测试）；3. 前端界面与全链路联调（由前端负责人负责，2周，需交付可运行系统与联调报告）；4. 预发验收与上线部署（由运维负责人负责，1周，需交付部署清单与线上验收证据）。',
    },
    {
      title: '智能知识库系统构建',
      text: '规划构建企业级智能RAG系统：包含“数据解析与向量清洗模块”（负责人小王，预计10天）、“大模型Prompt工程与知识库检索”（负责人小李，预计2周，需交付检索评测集）、“管理后台与用户交互前端”（负责人小张，预计2周）。',
    },
  ],
  node_tasks: [
    {
      title: '标准模块研发交付流',
      text: '本模块包含以下任务：1. 梳理业务逻辑与数据表结构设计（由架构师负责，3天，需交付ER图设计文档）；2. 核心增删改查与鉴权接口编写（由张工负责，5天）；3. 编写自动化集成测试脚本（由李工负责，3天，需交付测试用例报告）；4. 前端交互对接与接口联调（由王工负责，4天）。',
    },
    {
      title: '安全加固与性能压测',
      text: '1. API防刷与限流熔断中间件部署（3天，小刘负责）；2. 敏感数据脱敏与SQL防注入审计（2天，小陈负责，需交付安全审计报告）；3. 5000并发全链路压测与瓶颈分析（4天，小周负责，需交付压测达标报告）。',
    },
  ],
  task_subtasks: [
    {
      title: '任务细化交付步骤',
      text: '细分为以下子任务：1. 确定第三方服务对接协议与申请Token（负责人小王，1天）；2. 本地搭建Mock调试环境与单元用例（负责人小王，2天）；3. 编写异常重试与死信队列消费逻辑（负责人小李，3天，需提交代码评审）；4. 联调环境集成验收（负责人小李，1天，需交付联调验收截图）。',
    },
  ],
};

export function AiTextParseModal(props: AiTextParseModalProps) {
  if (!props.isOpen) return null;
  const key = `${props.targetLevel}_${props.targetNodeId || ''}_${props.targetTaskId || ''}`;
  return <AiTextParseModalInner key={key} {...props} />;
}

function AiTextParseModalInner({
  onClose,
  projectId,
  targetLevel: initialTargetLevel,
  targetNodeId,
  targetTaskId,
  contextName,
  defaultOwner,
  onSuccess,
}: AiTextParseModalProps) {
  const [targetLevel, setTargetLevel] = useState<WbsParseTargetLevel>(initialTargetLevel);
  const [inputText, setInputText] = useState('');
  const [ownerInput, setOwnerInput] = useState(defaultOwner);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // 解析结果草稿
  const [draftResult, setDraftResult] = useState<{
    summary: string;
    nodes?: ParsedDraftNode[];
    tasks?: ParsedDraftTask[];
  } | null>(null);

  const handleStartParse = async () => {
    if (!inputText.trim()) {
      setErrorMsg('请输入需要拆解的文本或选择预设示例');
      return;
    }
    setErrorMsg('');
    setIsParsing(true);

    try {
      const res = await fetch('/api/ai/parse-wbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          targetLevel,
          contextName,
          defaultOwner: ownerInput || defaultOwner,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '解析失败');

      setDraftResult({
        summary: data.data.summary,
        nodes: data.data.nodes || [],
        tasks: data.data.tasks || [],
      });
      setActiveTab('edit');
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 解析服务请求失败，请稍后重试');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!draftResult) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let filteredNodes = draftResult.nodes;
      let filteredTasks = draftResult.tasks;

      if (targetLevel === 'project_subnodes') {
        filteredNodes = (draftResult.nodes || [])
          .filter((n) => n.selected !== false)
          .map((n) => ({
            ...n,
            tasks: (n.tasks || []).filter((t) => t.selected !== false),
          }));

        if (!filteredNodes || filteredNodes.length === 0) {
          throw new Error('请至少勾选/选择一个要导入的分组模块');
        }
      } else {
        filteredTasks = (draftResult.tasks || []).filter((t) => t.selected !== false);
        if (!filteredTasks || filteredTasks.length === 0) {
          throw new Error('请至少勾选/选择一个要导入的任务草稿');
        }
      }

      const payload: BatchImportPayload = {
        projectId,
        targetLevel,
        targetNodeId,
        targetTaskId,
        author: ownerInput || defaultOwner || '负责人',
        nodes: filteredNodes,
        tasks: filteredTasks,
      };

      const res = await fetch('/api/nodes/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '导入失败');

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '批量入库失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = React.useMemo(() => {
    if (!draftResult) return 0;
    if (targetLevel === 'project_subnodes') {
      return (draftResult.nodes || []).filter((n) => n.selected !== false).length;
    } else {
      return (draftResult.tasks || []).filter((t) => t.selected !== false).length;
    }
  }, [draftResult, targetLevel]);

  const totalTasksCountInSelectedNodes = React.useMemo(() => {
    if (!draftResult || targetLevel !== 'project_subnodes') return 0;
    return (draftResult.nodes || [])
      .filter((n) => n.selected !== false)
      .reduce((acc, n) => acc + (n.tasks || []).filter((t) => t.selected !== false).length, 0);
  }, [draftResult, targetLevel]);

  const currentPresets = PRESET_TEMPLATES[targetLevel] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 bg-gradient-to-r from-blue-50/70 via-white to-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">AI 智能文本解析 & WBS 拆解</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  {targetLevel === 'project_subnodes'
                    ? '项目层 → 分组/模块'
                    : targetLevel === 'node_tasks'
                    ? '分组层 → 模块任务'
                    : '任务层 → 细分子任务'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                目标挂载节点：<span className="font-semibold text-zinc-700">{contextName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!draftResult ? (
            /* 步骤 1：输入与配置 */
            <div className="space-y-3.5">
              {/* 层级选择与负责人 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">拆解目标层级</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80">
                    <button
                      type="button"
                      onClick={() => setTargetLevel('project_subnodes')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium text-[11px] transition-all ${
                        targetLevel === 'project_subnodes'
                          ? 'bg-white text-zinc-900 shadow-3xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Layers className="h-3 w-3" />
                      <span>子分组/模块</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetLevel('node_tasks')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium text-[11px] transition-all ${
                        targetLevel === 'node_tasks'
                          ? 'bg-white text-blue-700 shadow-3xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>模块任务</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetLevel('task_subtasks')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium text-[11px] transition-all ${
                        targetLevel === 'task_subtasks'
                          ? 'bg-white text-emerald-700 shadow-3xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      <span>细分子任务</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">默认负责人</label>
                  <input
                    type="text"
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    placeholder="如：张三 / 研发组长"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 自然语言输入框 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-700">
                    输入自然语言文本（需求纪要、WBS计划、任务步骤等）
                  </label>
                  <span className="text-[10px] text-zinc-400">支持直接粘贴多行备忘</span>
                </div>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此输入或粘贴文本，例如：&#10;1. 建设订单中心（张工负责，2周，需交付订单状态机设计方案）&#10;2. 构建支付网关（李工负责，3周，需交付安全压测报告）&#10;3. 对账与清结算服务（王工负责，10天）..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* 预设示例快捷填充 */}
              {currentPresets.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">点击一键填入经典场景示例：</span>
                  <div className="flex flex-wrap gap-2">
                    {currentPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputText(preset.text)}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        ⚡ {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 步骤 2 & 3：草稿确认、编辑与预览工作台 */
            <div className="space-y-3.5">
              {/* 解析概要条 */}
              <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200/80 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-blue-950">AI 解析完成（草稿模式）</div>
                    <div className="text-[11px] text-blue-800 mt-0.5">{draftResult.summary}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftResult(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>重新输入</span>
                </button>
              </div>

              {/* Tab 切换：草稿编辑 vs 结构树预览 */}
              <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'edit'
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>草稿编辑与微调</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>结构拓扑预览</span>
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400">确认前不会写入数据库</span>
              </div>

              {/* 草稿编辑工作台 */}
              {activeTab === 'edit' ? (
                targetLevel === 'project_subnodes' ? (
                  <DraftNodesEditor
                    nodes={draftResult.nodes || []}
                    defaultOwner={ownerInput || defaultOwner}
                    onChange={(updatedNodes) => setDraftResult((prev) => (prev ? { ...prev, nodes: updatedNodes } : null))}
                  />
                ) : (
                  <DraftTasksEditor
                    tasks={draftResult.tasks || []}
                    defaultOwner={ownerInput || defaultOwner}
                    isSubtask={targetLevel === 'task_subtasks'}
                    title={targetLevel === 'task_subtasks' ? '待导入细分子任务草稿' : '待导入模块任务草稿'}
                    onChange={(updatedTasks) => setDraftResult((prev) => (prev ? { ...prev, tasks: updatedTasks } : null))}
                  />
                )
              ) : (
                <DraftPreviewTree
                  targetLevel={targetLevel}
                  contextName={contextName}
                  nodes={draftResult.nodes}
                  tasks={draftResult.tasks}
                />
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3 text-xs">
          <div className="text-[11px] text-zinc-500">
            {!draftResult ? '输入文本后点击「开始 AI 解析」生成结构化草稿' : '核对无误后点击「确认导入到系统」完成入库'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              取消
            </button>

            {!draftResult ? (
              <button
                type="button"
                disabled={isParsing || !inputText.trim()}
                onClick={handleStartParse}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>AI 智能解析中...</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5" />
                    <span>开始 AI 解析</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || selectedCount === 0}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>正在批量入库...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {targetLevel === 'project_subnodes'
                        ? `确认导入所选的 ${selectedCount} 个分组 (${totalTasksCountInSelectedNodes} 项任务)`
                        : targetLevel === 'node_tasks'
                        ? `确认导入所选的 ${selectedCount} 项任务`
                        : `确认导入所选的 ${selectedCount} 项子任务`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
