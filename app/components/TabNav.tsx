'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTerms } from '@/lib/storage';

export default function TabNav() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    getTerms().then(terms => setCount(terms.length)).catch(() => {});
  }, [pathname]);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4">
        <nav className="flex gap-0">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              pathname === '/'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>🔍</span>
            調べる
          </Link>
          <Link
            href="/library"
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              pathname === '/library'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>📚</span>
            用語集
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold ${
              pathname === '/library' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
