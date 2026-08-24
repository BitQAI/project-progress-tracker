'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Trash2, Minimize2, Send, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatTriggerButton } from './ai-chat/ChatTriggerButton';
import { ChatMessageItem, ChatMessage } from './ai-chat/ChatMessageItem';
import { safeFetchJson } from '@/lib/fetch-utils';

const emptySubscribe = () => () => {};

export function AiChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectContext, setProjectContext] = useState<any | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [showHintBubble, setShowHintBubble] = useState(true);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. 初始化拉取系统实时项目统计数据与进度趋势
  useEffect(() => {
    let isSubscribed = true;

    safeFetchJson('/api/ai/stats')
      .then((res) => {
        if (!isSubscribed) return;
        if (res.ok && res.data?.ok) {
          const data = res.data;
          setStatsData(data);
          const { metrics, criticalPendingTasks } = data;

          const statusText = metrics.isStagnating
            ? `⚠️ **进度停滞风险预警**：过去一周整体进度增长率为 **${metrics.growthRate}%** (日均 ${metrics.averageWeeklyGrowth}%)，项目近期几乎无交付进展，进度陷入停滞状态。`
            : `📈 **工作推进顺利**：过去一周整体进度增加了 **${metrics.growthRate}%** (日均 ${metrics.averageWeeklyGrowth}%)，各项工作稳步向前推进。`;

          let criticalTasksText = '';
          if (criticalPendingTasks && criticalPendingTasks.length > 0) {
            criticalTasksText =
              `\n\n**🔍 当前极需关注的临期/逾期任务**：\n` +
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
          throw new Error(res.error || 'Stats api error');
        }
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err?.message !== 'Request aborted') {
          console.warn('Failed to load stats welcome message:', err?.message || err);
        }
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              '您好！我是您的项目进度管理系统智能助理 **BitQAI**。\n\n我拥有系统的**全局只读权限**。无论是关于某个具体项目的 WBS 拆解，还是想了解当前有哪些项目超期、谁的进度滞后、或者需要全局的风险诊断，我都能基于**系统中的实时真实数据**为您解答。有什么我可以帮您的？',
            timestamp: new Date(),
          },
        ]);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 提取项目 ID
  const projectId = pathname?.startsWith('/projects/') ? pathname.split('/')[2] : null;

  // 监听当前浏览页面的项目
  useEffect(() => {
    let isSubscribed = true;
    if (projectId) {
      safeFetchJson(`/api/projects/${projectId}`)
        .then((res) => {
          if (isSubscribed) {
            if (res.ok && res.data?.ok && res.data?.data) {
              setProjectContext(res.data.data);
            } else {
              setProjectContext(null);
            }
          }
        })
        .catch(() => {
          if (isSubscribed) {
            setProjectContext(null);
          }
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  // 滚动至最新消息
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // 序列化当前项目的上下文
  const getSerializedContext = (): string => {
    const currentContext = projectId ? projectContext : null;
    if (!currentContext) return '';
    try {
      let text = `【用户正在浏览的项目】: ${currentContext.name}\n`;
      text += `状态: ${currentContext.status} | 负责人: ${currentContext.owner}\n`;
      text += `截止日期: ${currentContext.due_date || '未排期'}\n\n`;
      return text;
    } catch {
      return '';
    }
  };

  // 全链路极速流式发送
  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: rawText,
      timestamp: new Date(),
    };

    const assistantMsgId = Math.random().toString(36).substring(7);
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const contextText = getSerializedContext();
      const payloadMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let res: Response;
      try {
        res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            context: contextText || undefined,
          }),
          signal: abortController.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.error('[AiChat] Network error:', err);
        throw new Error('网络请求失败，请检查网络连接或稍后重试');
      }

      if (!res.ok) {
        let errMsg = `服务响应异常 (${res.status})`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      if (!res.body) {
        throw new Error('未接收到流式响应数据');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content) {
                accumulatedText += data.content;
                setIsLoading(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedText, isStreaming: true }
                      : msg
                  )
                );
              }
            } catch {
              // 忽略解析中间态分块错误
            }
          }
        }
      }

      // 流结束，更新状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: accumulatedText || '（暂无回复内容）', isStreaming: false }
            : msg
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorContent = `发生错误: ${err.message || '网络连接异常，请检查配置。'}`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: errorContent, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          '对话历史已重置。我是您的项目助理 **BitQAI**，已连接系统实时数据库，随时为您提供全局进度把控和 WBS 层级拆解建议。',
        timestamp: new Date(),
      },
    ]);
  };

  const activeProjectContext = projectId ? projectContext : null;

  return (
    <>
      <ChatTriggerButton
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        showHintBubble={showHintBubble}
        setShowHintBubble={setShowHintBubble}
      />

      {/* 对话视窗 */}
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
            {/* Header */}
            <div className="flex items-center justify-between bg-blue-50/40 border-b border-blue-100/55 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden shadow-2xs bg-blue-100">
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-sky-400 via-indigo-500 to-white animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                  <div className="absolute inset-[2px] rounded-full bg-white/95" />
                  <Bot className="relative h-4 w-4 text-blue-600 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-[13px] font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">
                    BitQAI 智能管家
                  </h3>
                  <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider">
                    AI Streaming Assistant
                  </p>
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

            {/* 当前项目上下文 */}
            {activeProjectContext && (
              <div className="flex items-center gap-1.5 bg-blue-50/30 border-b border-blue-100/30 px-5 py-2 text-[10px] text-blue-600 font-medium">
                <div className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="truncate">当前聚焦 WBS：{activeProjectContext.name}</span>
              </div>
            )}

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/10 to-white/40 p-5 space-y-4">
              {messages.map((m) => {
                if (m.role === 'assistant' && !m.content && m.isStreaming) {
                  return (
                    <div key={m.id} className="flex justify-start animate-fade-in">
                      <div className="flex items-center gap-2 max-w-[85%] rounded-2xl bg-white border border-blue-100 px-4 py-3 text-xs text-zinc-400 rounded-bl-none shadow-2xs animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        <span className="font-medium text-blue-500">BitQAI 正在思考与实时组织回复...</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <ChatMessageItem
                    key={m.id}
                    message={m}
                    isFirstWelcome={m.id === 'welcome' && messages.length <= 1}
                    onQuickPrompt={handleSend}
                    statsData={statsData}
                    isMounted={isMounted}
                    projectContext={activeProjectContext}
                  />
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* 底部输入框 */}
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
                    activeProjectContext
                      ? '向 BitQAI 询问此项目的风险、WBS拆解...'
                      : '全局诊断、超期分析、未完任务核对...'
                  }
                  disabled={isLoading}
                  className="flex-1 h-9 rounded-full border border-zinc-200 bg-zinc-100/50 px-4 text-xs text-zinc-950 placeholder-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none transition-all disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none transition-all shrink-0 cursor-pointer"
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
