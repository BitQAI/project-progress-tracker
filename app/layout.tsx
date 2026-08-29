import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AiChatWidget } from '@/components/AiChatWidget';

export const metadata: Metadata = {
  title: 'Project Progress Tracker',
  description: '项目进度管理系统 - 老板一屏直观掌握项目进度与超期状态，员工极简勾选驱动进度，支持无限层级项目树、交付件模板与评论留档',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var originalFetch = window.fetch;
                  var currentFetch = typeof originalFetch === 'function' ? originalFetch.bind(window) : originalFetch;
                  Object.defineProperty(window, 'fetch', {
                    get: function() {
                      return currentFetch;
                    },
                    set: function(fn) {
                      currentFetch = fn;
                    },
                    configurable: true,
                    enumerable: true
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <AiChatWidget />
      </body>
    </html>
  );
}
