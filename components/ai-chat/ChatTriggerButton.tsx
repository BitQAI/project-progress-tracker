'use client';

import React from 'react';
import { X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatTriggerButtonProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  showHintBubble: boolean;
  setShowHintBubble: (show: boolean) => void;
}

export function ChatTriggerButton({
  isOpen,
  setIsOpen,
  showHintBubble,
  setShowHintBubble,
}: ChatTriggerButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-end">
      {/* 浮动提示可点击状态 */}
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
                    极速流式对话
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  实时吐字 · 风险诊断 · 拆解 WBS
                </span>
              </div>

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

              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-t border-r border-blue-200 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 耀斑动画样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
        `,
        }}
      />

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
        {!isOpen && (
          <div className="absolute inset-0 rounded-full pointer-events-none select-none">
            <div
              className="absolute inset-[-4px] bg-blue-500/35 blur-md"
              style={{
                animation: 'solar-flare-morph-1 8s infinite linear',
                willChange: 'transform, border-radius',
              }}
            />
            <div
              className="absolute inset-[-6px] bg-sky-400/30 blur-lg"
              style={{
                animation: 'solar-flare-morph-2 6s infinite linear',
                willChange: 'transform, border-radius',
              }}
            />
            <div
              className="absolute inset-[-2px] bg-white/40 blur-xs"
              style={{
                animation: 'solar-flare-morph-3 4.5s infinite linear',
                willChange: 'transform, border-radius',
              }}
            />
          </div>
        )}

        {isOpen ? (
          <X className="h-5 w-5 text-white transition-transform duration-300" />
        ) : (
          <div className="relative h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] animate-pulse z-10" />
        )}
      </motion.button>
    </div>
  );
}
