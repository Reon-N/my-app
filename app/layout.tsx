import type { Metadata } from 'next';
import './globals.css';
import TabNav from './components/TabNav';

export const metadata: Metadata = {
  title: 'IT用語集 | システム開発・コンサルティング',
  description: 'システム開発・コンサルティング・IT分野の用語集',
};

function BookIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="8" width="10" height="18" rx="2" fill="#4CAF50" />
      <rect x="4" y="6" width="10" height="18" rx="2" fill="#E91E63" />
      <rect x="6" y="4" width="10" height="18" rx="2" fill="#2196F3" />
      <rect x="14" y="6" width="10" height="18" rx="2" fill="#9C27B0" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-2.5">
            <BookIcon />
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-base font-bold text-slate-900">IT用語集</span>
              <span className="text-xs text-slate-400">システム開発・コンサル・IT</span>
            </div>
          </div>
        </header>

        {/* Tab navigation */}
        <TabNav />

        {/* Page content */}
        <main className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
