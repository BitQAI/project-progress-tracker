'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  X,
  Send,
  Loader2,
  Trash2,
  Minimize2,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Layers,
  ListTodo,
  Sparkles,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  Cell
} from 'recharts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AiChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectContext, setProjectContext] = useState<any | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showHintBubble, setShowHintBubble] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. 初始化拉取系统实时项目统计数据与进度趋势
  useEffect(() => {
    setIsMounted(true);

    fetch('/api/ai/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatsData(data);
          const { metrics, criticalPendingTasks } = data;

          const statusText = metrics.isStagnating
            ? `⚠️ **进度停滞风险预警**：过去一周整体进度增长率为 **${metrics.growthRate}%** (日均 ${metrics.averageWeeklyGrowth}%)，项目近期几乎无交付进展，进度陷入停滞状态。`
            : `📈 **工作推进顺利**：过去一周整体进度增加了 **${metrics.growthRate}%** (日均 ${metrics.averageWeeklyGrowth}%)，各项工作稳步向前推进。`;

          let criticalTasksText = '';
          if (criticalPendingTasks && criticalPendingTasks.length > 0) {
            criticalTasksText = `\n\n**🔍 当前极需关注的临期/逾期任务**：\n` +
              criticalPendingTasks
                .map(
                  (t: any) =>
                    `- **${t.name}** (负责人: ${t.owner} | 截止日: ${t.dueDate}${
                      t.isOverdue ? ' | ⚠️ 已逾期' : ''
                    })`
                )
                .join('\n');
          } else {
            criticalTasksText = `\n\n**✅ 棒！当前系统内无紧急或逾期的关键待办任务。**`;
          }

          const welcomeMsg = `您好！我是您的项目进度管理系统智能助理 **BitQAI**。\n\n我已为您自动拉取了**当前系统项目数据的最新分析摘要**：\n\n- **项目整体完成度**：**${metrics.overallProgress}%** (共 ${metrics.totalProjects} 个项目)\n- **任务状态分布**：已完成 **${metrics.completedTasksCount}** 项，进行中 **${metrics.pendingTasksCount}** 项，已逾期 **${metrics.overdueTasksCount}** 项\n- ${statusText}${criticalTasksText}\n\n[CHART:TREND]\n\n作为您的项目管家，我随时为您诊断项目风险、分析发展趋势或协助梳理 WBS。您今天想看哪个项目？`;

          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: welcomeMsg,
              timestamp: new Date(),
            },
          ]);
        } else {
          throw new Error('Stats api error');
        }
      })
      .catch((err) => {
        console.error('Failed to load stats welcome message:', err);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              '您好！我是您的项目进度管理系统智能助理 **BitQAI**。\n\n我拥有系统的**全局只读权限**。无论是关于某个具体项目的 WBS 拆解，还是想了解当前有哪些项目超期、谁的进度滞后、或者需要全局的风险诊断，我都能基于**系统中的实时真实数据**为您解答。有什么我可以帮您的？',
            timestamp: new Date(),
          },
        ]);
      })
      .finally(() => {
        setIsStatsLoading(false);
      });
  }, []);

  // 提取项目 ID
  const projectId = pathname?.startsWith('/projects/') ? pathname.split('/')[2] : null;

  // 监听当前浏览页面的项目
  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.ok && resData.data) {
            setProjectContext(resData.data);
          }
        })
        .catch((err) => console.error('Failed to load project context for AI:', err));
    } else {
      setProjectContext(null);
    }
  }, [projectId]);

  // 滚动至最新消息
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 序列化当前项目的 WBS
  const getSerializedContext = (): string => {
    if (!projectContext) return '';
    try {
      let text = `【用户正在浏览的项目】: ${projectContext.name}\n`;
      text += `状态: ${projectContext.status} | 负责人: ${projectContext.owner}\n`;
      text += `截止日期: ${projectContext.due_date || '未排期'}\n\n`;
      return text;
    } catch (e) {
      return '';
    }
  };

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: rawText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const contextText = getSerializedContext();
      const payloadMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          context: contextText || undefined
        })
      });

      const data = await res.json();
      if (data.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            content: data.text,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error(data.error || '获取 AI 回复失败');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: `发生错误: ${err.message || '网络连接超时，请检查配置的环境变量或网络。'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('确定要清空与 BitQAI 的对话历史吗？')) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '对话历史已重置。我是您的项目助理 **BitQAI**，已成功连接系统实时数据库，随时为您提供全局进度把控和 WBS 层级拆解建议。',
          timestamp: new Date()
        }
      ]);
    }
  };

  // 渲染 Markdown 格式文本
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      let trimmed = line.trim();
      
      // 检查 Markdown 标题 (# 后面必须有空格)
      const headerMatch = trimmed.match(/^(#{1,6})\s(.*)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const sizeClass = level === 1 
          ? 'text-sm sm:text-base font-bold text-zinc-950 mt-3 mb-1.5' 
          : level === 2 
            ? 'text-xs sm:text-sm font-bold text-zinc-900 mt-2.5 mb-1' 
            : 'text-xs font-semibold text-zinc-800 mt-2 mb-0.5';
        return (
          <div key={index} className={`${sizeClass} tracking-tight`}>
            {renderBoldText(text)}
          </div>
        );
      }
      
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        return (
          <li key={index} className="ml-4 list-disc text-xs sm:text-[13px] text-zinc-700 leading-relaxed mb-1">
            {renderBoldText(text)}
          </li>
        );
      }

      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={index} className="ml-4 list-decimal text-xs sm:text-[13px] text-zinc-700 leading-relaxed mb-1">
            {renderBoldText(numMatch[2])}
          </li>
        );
      }

      return (
        <p key={index} className="text-xs sm:text-[13px] text-zinc-700 leading-relaxed mb-1.5 min-h-[0.75rem]">
          {renderBoldText(line)}
        </p>
      );
    });
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-zinc-950 px-0.5">{part}</strong>;
      }
      return part;
    });
  };

  // 内置的可视化图表组件，完美融合苹果极简质感与系统实时统计数据
  const renderChatChart = (type: 'trend' | 'projects' | 'tasks') => {
    if (!statsData) return <div className="h-36 w-full flex items-center justify-center text-[10px] text-zinc-400 bg-zinc-50/50 rounded-lg animate-pulse border border-dashed border-zinc-200 mt-2">正在同步系统实时趋势数据...</div>;
    if (!isMounted) return <div className="h-36 w-full bg-zinc-50 rounded-lg animate-pulse mt-2" />;

    const COLORS = ['#10b981', '#3b82f6', '#ef4444']; // 已完成, 进行中, 已逾期

    try {
      if (type === 'trend') {
        return (
          <div className="mt-3.5 p-3.5 bg-zinc-50/50 border border-zinc-100 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
            <p className="text-[11px] font-semibold text-zinc-900 mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-zinc-600" />
              过去一周项目进度趋势 (累计 %)
            </p>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statsData.trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  />
                  <Line type="monotone" dataKey="进度" stroke="#18181b" strokeWidth={2} dot={{ r: 3, fill: '#18181b' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      if (type === 'projects') {
        return (
          <div className="mt-3.5 p-3.5 bg-zinc-50/50 border border-zinc-100 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
            <p className="text-[11px] font-semibold text-zinc-900 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-600" />
              各个项目当前完成进度百分比 (%)
            </p>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.projectProgressData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
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
                    data={statsData.taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statsData.taskStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[12px] font-bold text-zinc-900">
                  {statsData.metrics.completedTasksCount + statsData.metrics.pendingTasksCount + statsData.metrics.overdueTasksCount}
                </span>
                <span className="text-[8px] text-zinc-400 font-medium">总任务</span>
              </div>
            </div>
            <div className="flex gap-4 mt-1.5 justify-center w-full">
              {statsData.taskStatusData.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
    } catch (e) {
      console.error('Error rendering chart in bubble:', e);
      return <div className="h-36 w-full flex items-center justify-center text-[10px] text-zinc-400 bg-zinc-50 rounded-lg">图表渲染出错</div>;
    }
    return null;
  };

  // 快捷 Prompt 提示
  const quickPrompts = [
    { id: 'risk', label: '诊断风险', prompt: '请帮我诊断一下当前系统里所有正在推进的项目，有哪些项目存在超期风险？谁的任务比较滞后？给出具体的红色警报和纠偏方案。' },
    { id: 'wbs', label: '拆解WBS', prompt: projectContext 
        ? `请结合当前我正在看的「${projectContext.name}」项目，帮我做进一步的 WBS（工作分解结构）层级深度细化。` 
        : '我想新建一个高管绩效考核项目，请帮我出一套标准的 WBS 任务节点大纲及对应交付件标准。' 
    },
    { id: 'todo', label: '待办清单', prompt: '请帮我梳理一下系统内当前所有未完成（进行中）的任务清单，按负责人和紧急程度进行分类汇总。' }
  ];

  return (
    <>
      {/* 1. 悬浮触发按钮与进入页面动效提示 */}
      <div className="fixed bottom-6 right-6 z-40 flex items-end">
        {/* 登录/进入页面时的引导气泡动效（浮动提示可点击状态） */}
        <AnimatePresence>
          {!isOpen && showHintBubble && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                y: [0, -5, 0],
              }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={{
                y: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
              }}
              className="mr-3 cursor-pointer group select-none hidden sm:block"
              onClick={() => {
                setIsOpen(true);
                setShowHintBubble(false);
              }}
            >
              <div className="relative flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-white/95 px-3.5 py-2 shadow-[0_8px_30px_rgba(37,99,235,0.15)] backdrop-blur-xl hover:border-blue-300 hover:shadow-[0_10px_35px_rgba(37,99,235,0.20)] transition-all">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 text-white shadow-2xs shrink-0 animate-pulse">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900">BitQAI 智能管家</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700 border border-emerald-200/60">
                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      点击咨询
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    诊断项目风险 · 梳理 WBS · 核查超期
                  </span>
                </div>

                {/* 关闭气泡提示 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHintBubble(false);
                  }}
                  className="ml-0.5 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  title="关闭提示"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* 指向右侧按钮的箭头三角 */}
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-t border-r border-blue-200 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 触发主按钮：极致Apple极简艺术，晶莹水晶球与动态太阳耀斑（Solar Flares）光冕爆发动效 */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes solar-flare-morph-1 {
            0% {
              border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
              transform: rotate(0deg) scale(1.1);
            }
            50% {
              border-radius: 65% 35% 50% 50% / 55% 45% 55% 45%;
              transform: rotate(180deg) scale(1.5);
            }
            100% {
              border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
              transform: rotate(360deg) scale(1.1);
            }
          }
          @keyframes solar-flare-morph-2 {
            0% {
              border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%;
              transform: rotate(180deg) scale(1.2);
            }
            50% {
              border-radius: 35% 65% 60% 40% / 45% 55% 45% 55%;
              transform: rotate(360deg) scale(1.7);
            }
            100% {
              border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%;
              transform: rotate(540deg) scale(1.2);
            }
          }
          @keyframes solar-flare-morph-3 {
            0% {
              border-radius: 30% 70% 40% 60% / 50% 40% 60% 50%;
              transform: rotate(360deg) scale(1.0);
            }
            50% {
              border-radius: 60% 40% 55% 45% / 40% 60% 45% 55%;
              transform: rotate(180deg) scale(1.4);
            }
            100% {
              border-radius: 30% 70% 40% 60% / 50% 40% 60% 50%;
              transform: rotate(0deg) scale(1.0);
            }
          }
        `}} />

        <motion.button
          id="ai-floating-trigger-btn"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowHintBubble(false);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`relative flex items-center justify-center h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-300 group cursor-pointer ${
            isOpen
              ? 'bg-zinc-900/90 text-white border-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.15)]'
              : 'bg-white/5 border-white/20 hover:border-white/35 shadow-[0_8px_32px_rgba(37,99,235,0.08)]'
          }`}
          title="点击唤起 BitQAI 智能管家"
        >
          {/* 未展开时：在水晶球深处及四周，渲染太阳耀斑（Solar Flares）动态流光 */}
          {!isOpen && (
            <div className="absolute inset-0 rounded-full pointer-events-none select-none">
              {/* 太阳耀斑层 1：幽蓝等离子层 */}
              <div
                className="absolute inset-[-4px] bg-blue-500/35 blur-md"
                style={{
                  animation: 'solar-flare-morph-1 8s infinite linear',
                  willChange: 'transform, border-radius'
                }}
              />
              {/* 太阳耀斑层 2：霓虹天空蓝跃动层 */}
              <div
                className="absolute inset-[-6px] bg-sky-400/30 blur-lg"
                style={{
                  animation: 'solar-flare-morph-2 6s infinite linear',
                  willChange: 'transform, border-radius'
                }}
              />
              {/* 太阳耀斑层 3：炽白高亮核心闪焰 */}
              <div
                className="absolute inset-[-2px] bg-white/40 blur-xs"
                style={{
                  animation: 'solar-flare-morph-3 4.5s infinite linear',
                  willChange: 'transform, border-radius'
                }}
              />
            </div>
          )}

          {/* 按钮中心的极简交互控制 */}
          {isOpen ? (
            <X className="h-5 w-5 text-white transition-transform duration-300" />
          ) : (
            // 晶莹的水晶球中央悬浮着一粒高亮白昼闪焰核
            <div className="relative h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] animate-pulse z-10" />
          )}
        </motion.button>
      </div>

      {/* 2. 对话弹窗：Apple 风格的高保真极简视窗 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chat-drawer-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed bottom-16 sm:bottom-22 right-3 sm:right-6 z-40 flex h-[480px] sm:h-[620px] w-[calc(100vw-24px)] sm:w-[410px] flex-col rounded-[24px] border border-blue-100 bg-gradient-to-b from-blue-50/95 via-white/98 to-white shadow-[0_12px_40px_rgba(37,99,235,0.15)] backdrop-blur-2xl overflow-hidden font-sans antialiased"
          >
            {/* 顶部 Header: 苹果风格的蓝白渐变留白与精致排版 */}
            <div className="flex items-center justify-between bg-blue-50/40 border-b border-blue-100/55 px-5 py-4">
              <div className="flex items-center gap-3">
                {/* 迷你智能机器人 蓝白渐变炫影 Logo */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden shadow-2xs bg-blue-100">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-sky-400 via-indigo-500 to-white animate-spin" style={{ animationDuration: '6s' }} />
                  <div className="absolute inset-[2px] rounded-full bg-white/95" />
                  <Bot className="relative h-4 w-4 text-blue-600 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-[13px] font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">
                    BitQAI 智能管家
                  </h3>
                  <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider">AI Robot Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearChat}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                  title="清空会话"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                  title="最小化"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 当前浏览上下文提示 */}
            {projectContext && (
              <div className="flex items-center gap-1.5 bg-blue-50/30 border-b border-blue-100/30 px-5 py-2 text-[10px] text-blue-600 font-medium">
                <div className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="truncate">当前聚焦 WBS：{projectContext.name}</span>
              </div>
            )}

            {/* 对话内容区域 */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/10 to-white/40 p-5 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none font-medium'
                        : 'bg-white text-zinc-800 border border-blue-100 shadow-3xs rounded-bl-none'
                    }`}
                  >
                    {(() => {
                      const trendMatch = m.content.includes('[CHART:TREND]');
                      const projectsMatch = m.content.includes('[CHART:PROJECTS]');
                      const tasksMatch = m.content.includes('[CHART:TASKS]');

                      let cleanContent = m.content;
                      cleanContent = cleanContent
                        .replace('[CHART:TREND]', '')
                        .replace('[CHART:PROJECTS]', '')
                        .replace('[CHART:TASKS]', '')
                        .trim();

                      return (
                        <>
                          {m.role === 'assistant' ? (
                            renderMessageContent(cleanContent)
                          ) : (
                            <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed">{cleanContent}</p>
                          )}

                          {/* 渲染对应 Recharts 可视化图表 */}
                          {trendMatch && renderChatChart('trend')}
                          {projectsMatch && renderChatChart('projects')}
                          {tasksMatch && renderChatChart('tasks')}
                        </>
                      );
                    })()}

                    {/* 如果是初始欢迎消息，且对话尚未正式开始，则在初始对话文本的气泡内部末尾展示快捷胶囊按钮 */}
                    {m.id === 'welcome' && messages.length <= 1 && (
                      <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-row flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none">
                        {quickPrompts.map((p, idx) => {
                          const getIcon = () => {
                            if (p.id === 'risk') return <TrendingUp className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />;
                            if (p.id === 'wbs') return <Layers className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />;
                            return <ListTodo className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />;
                          };
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSend(p.prompt)}
                              className="flex items-center rounded-full border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-950 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-all group shrink-0 shadow-3xs"
                            >
                              {getIcon()}
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <span
                      className={`block mt-1.5 text-[8px] text-right font-medium ${
                        m.role === 'user' ? 'text-zinc-400' : 'text-zinc-400'
                      }`}
                    >
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-center gap-2 max-w-[85%] rounded-2xl bg-white border border-blue-100 px-4 py-3 text-xs text-zinc-400 rounded-bl-none shadow-2xs animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span className="font-medium text-blue-500">思考中...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 底部输入框 (Apple 风格圆角输入) */}
            <div className="border-t border-zinc-200/60 bg-white p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    projectContext
                      ? "向 BitQAI 询问此项目的风险、WBS拆解..."
                      : "全局诊断、超期分析、未完任务核对..."
                  }
                  disabled={isLoading}
                  className="flex-1 h-9 rounded-full border border-zinc-200 bg-zinc-100/50 px-4 text-xs text-zinc-950 placeholder-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none transition-all disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none transition-all shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
