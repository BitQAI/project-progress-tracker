'use client';

import React from 'react';
import { TrendingUp, Layers, ListTodo } from 'lucide-react';
import { ChatChart } from './ChatChart';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isFirstWelcome: boolean;
  onQuickPrompt: (prompt: string) => void;
  statsData: any;
  isMounted: boolean;
  projectContext: any | null;
}

export function ChatMessageItem({
  message,
  isFirstWelcome,
  onQuickPrompt,
  statsData,
  isMounted,
  projectContext,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-semibold text-zinc-950 px-0.5">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();

      const headerMatch = trimmed.match(/^(#{1,6})\s(.*)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const sizeClass =
          level === 1
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

  const quickPrompts = [
    {
      id: 'risk',
      label: '诊断风险',
      prompt:
        '请帮我诊断一下当前系统里所有正在推进的项目，有哪些项目存在超期风险？谁的任务比较滞后？给出具体的红色警报和纠偏方案。',
    },
    {
      id: 'wbs',
      label: '拆解WBS',
      prompt: projectContext
        ? `请结合当前我正在看的「${projectContext.name}」项目，帮我做进一步的 WBS（工作分解结构）层级深度细化。`
        : '我想新建一个高管绩效考核项目，请帮我出一套标准的 WBS 任务节点大纲及对应交付件标准。',
    },
    {
      id: 'todo',
      label: '待办清单',
      prompt: '请帮我梳理一下系统内当前所有未完成（进行中）的任务清单，按负责人和紧急程度进行分类汇总。',
    },
  ];

  const trendMatch = message.content.includes('[CHART:TREND]');
  const projectsMatch = message.content.includes('[CHART:PROJECTS]');
  const tasksMatch = message.content.includes('[CHART:TASKS]');

  let cleanContent = message.content
    .replace('[CHART:TREND]', '')
    .replace('[CHART:PROJECTS]', '')
    .replace('[CHART:TASKS]', '')
    .trim();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs leading-relaxed ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none font-medium'
            : 'bg-white text-zinc-800 border border-blue-100 shadow-3xs rounded-bl-none'
        }`}
      >
        {isUser ? (
          <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed">{cleanContent}</p>
        ) : (
          <>
            {renderMessageContent(cleanContent)}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-500 animate-pulse rounded-xs align-middle" />
            )}
            {trendMatch && <ChatChart type="trend" statsData={statsData} isMounted={isMounted} />}
            {projectsMatch && <ChatChart type="projects" statsData={statsData} isMounted={isMounted} />}
            {tasksMatch && <ChatChart type="tasks" statsData={statsData} isMounted={isMounted} />}
          </>
        )}

        {isFirstWelcome && (
          <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-row flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((p, idx) => {
              const getIcon = () => {
                if (p.id === 'risk') {
                  return (
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                  );
                }
                if (p.id === 'wbs') {
                  return (
                    <Layers className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                  );
                }
                return (
                  <ListTodo className="h-3.5 w-3.5 mr-1 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                );
              };
              return (
                <button
                  key={idx}
                  onClick={() => onQuickPrompt(p.prompt)}
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
            isUser ? 'text-blue-100' : 'text-zinc-400'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
