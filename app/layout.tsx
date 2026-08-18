import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: '项目进度管理系统 (Project Progress Tracker)',
  description: '老板一屏直观掌握项目进度与超期状态，员工极简勾选驱动进度，支持无限层级项目树、交付件模板与证据链留档',
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
                  if (typeof window !== 'undefined') {
                    var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
                    var _currentFetch = nativeFetch;
                    try {
                      Object.defineProperty(window, 'fetch', {
                        get: function() { return _currentFetch; },
                        set: function(newFetch) { _currentFetch = newFetch; },
                        configurable: true,
                        enumerable: true
                      });
                    } catch (e1) {
                      try {
                        var proto = Object.getPrototypeOf(window);
                        if (proto) {
                          Object.defineProperty(proto, 'fetch', {
                            get: function() { return _currentFetch; },
                            set: function(newFetch) { _currentFetch = newFetch; },
                            configurable: true,
                            enumerable: true
                          });
                        }
                      } catch (e2) {}
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
