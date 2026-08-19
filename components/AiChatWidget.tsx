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
  ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AiChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是您的项目进度管理系统智能助理 **BitQAI**。\n\n我拥有系统的**全局只读权限**。无论是关于某个具体项目的 WBS 拆解，还是想了解当前有哪些项目超期、谁的进度滞后、或者需要全局的风险诊断，我都能基于**系统中的实时真实数据**为您解答。有什么我可以帮您的？',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectContext, setProjectContext] = useState<any | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

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
      {/* 1. 悬浮触发按钮：Apple 风格极简设计（带有磨砂玻璃质感与炫彩 Apple Intelligence 渐变） */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="ai-floating-trigger-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200/80 bg-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl hover:scale-[1.04] active:scale-[0.96] transition-all duration-300 relative overflow-hidden group`}
          title="召唤 AI 智能管家"
        >
          {isOpen ? (
            <X className="h-5 w-5 text-zinc-500 transition-transform duration-300" />
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Apple Intelligence 炫彩虹吸呼吸球 */}
              <div className="absolute h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500/90 via-purple-500/90 via-pink-500/90 to-amber-400/90 opacity-80 blur-xs group-hover:scale-110 transition-transform duration-500 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="absolute h-5 w-5 rounded-full bg-gradient-to-bl from-blue-400 via-violet-500 to-rose-400 opacity-90 mix-blend-screen animate-pulse" />
              
              {/* 内敛的微标 */}
              <div className="relative flex h-3 w-3 items-center justify-center rounded-full bg-white/90 shadow-2xs">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
              </div>
            </div>
          )}
        </button>
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
            className="fixed bottom-22 right-6 z-40 flex h-[620px] w-[410px] max-w-[calc(100vw-32px)] flex-col rounded-[24px] border border-zinc-200/75 bg-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl overflow-hidden font-sans antialiased"
          >
            {/* 顶部 Header: 苹果风格的极致留白与精致排版 */}
            <div className="flex items-center justify-between bg-zinc-50/70 border-b border-zinc-200/50 px-5 py-4">
              <div className="flex items-center gap-3">
                {/* 迷你 Apple Intelligence 炫影 Logo */}
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full overflow-hidden shadow-2xs">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 via-pink-400 to-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                  <div className="absolute inset-[2px] rounded-full bg-white/95" />
                  <div className="relative h-2 w-2 rounded-full bg-zinc-950 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-[13px] font-semibold text-zinc-900 tracking-tight flex items-center gap-1.5">
                    BitQAI 智能管家
                  </h3>
                  <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider">Apple Intelligent Assistant</p>
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
              <div className="flex items-center gap-1.5 bg-zinc-100/40 border-b border-zinc-200/40 px-5 py-2 text-[10px] text-zinc-500 font-medium">
                <div className="flex h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span className="truncate">当前聚焦 WBS：{projectContext.name}</span>
              </div>
            )}

            {/* 对话内容区域 */}
            <div className="flex-1 overflow-y-auto bg-zinc-50/20 p-5 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-zinc-900 text-white rounded-br-none font-medium'
                        : 'bg-white text-zinc-800 border border-zinc-200/60 rounded-bl-none'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      renderMessageContent(m.content)
                    ) : (
                      <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    )}

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
                  <div className="flex items-center gap-2 max-w-[85%] rounded-2xl bg-white border border-zinc-200/50 px-4 py-3 text-xs text-zinc-400 rounded-bl-none shadow-2xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    <span className="font-medium">思考中...</span>
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
