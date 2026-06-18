'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Term, ExplainResponse } from '@/lib/types';
import { saveTerm, getCategoryStats, getTerms } from '@/lib/storage';

export default function Home() {
  const [inputTerm, setInputTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState('');
  const [savedTerm, setSavedTerm] = useState<Term | null>(null);
  const [recentTerms, setRecentTerms] = useState<Term[]>([]);

  useEffect(() => {
    getTerms().then(terms => setRecentTerms(terms.slice(0, 5)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTerm.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    setSavedTerm(null);

    try {
      // Supabase failure is non-fatal — proceed with empty stats
      let categoryStats: Record<string, number> = {};
      try { categoryStats = await getCategoryStats(); } catch { /* ignore */ }

      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: inputTerm.trim(), categoryStats }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'エラーが発生しました');

      setResult(data);

      const term: Term = {
        id: crypto.randomUUID(),
        term: inputTerm.trim(),
        shortExplanation: data.shortExplanation,
        detailedExplanation: data.detailedExplanation,
        category: data.category,
        createdAt: new Date().toISOString(),
      };

      // Save and refresh — non-fatal if Supabase is unavailable
      try {
        await saveTerm(term);
        const updated = await getTerms();
        setRecentTerms(updated.slice(0, 5));
      } catch { /* ignore */ }

      setSavedTerm(term);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputTerm('');
    setResult(null);
    setError('');
    setSavedTerm(null);
  };

  const categoryParts = savedTerm?.category?.split('/') || [];

  return (
    <div className="space-y-4">
      {/* Search card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">用語を調べる</h2>
        <p className="text-sm text-gray-500 mb-4">
          調べたい単語・用語を入力してください。AIが解説・カテゴリ・サブカテゴリを自動生成します。
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputTerm}
            onChange={e => setInputTerm(e.target.value)}
            placeholder="例: マイクロサービス、PoC、ITSM、ゼロトラスト..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputTerm.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isLoading ? '生成中...' : '調べる'}
          </button>
        </form>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-600">「{inputTerm}」を解析中...</p>
          <p className="text-xs text-gray-400 mt-1">AIが解説と分類を生成しています</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && savedTerm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Term title bar */}
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{savedTerm.term}</h3>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {categoryParts.map((part, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-indigo-300 text-xs">›</span>}
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{part}</span>
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={handleReset} className="text-white/70 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors shrink-0">
                ✕ 閉じる
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">かんたん解説</p>
              <div className="bg-indigo-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                {result.shortExplanation}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">詳細解説</p>
              <p className="text-sm text-gray-600 leading-7 whitespace-pre-line">{result.detailedExplanation}</p>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleReset} className="py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                別の用語を調べる
              </button>
              <a href="/library" className="py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors text-center">
                用語一覧を見る →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Recent terms */}
      {!result && !isLoading && recentTerms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">最近調べた用語</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {recentTerms.map(term => (
              <button
                key={term.id}
                onClick={() => setInputTerm(term.term)}
                className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="font-semibold text-gray-800 text-sm mb-0.5">{term.term}</div>
                <div className="text-xs text-gray-400 mb-1.5">{term.category}</div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{term.shortExplanation}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
