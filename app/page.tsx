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
  const [isSaved, setIsSaved] = useState(false);

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
    setIsSaved(false);

    try {
      const categoryStats = await getCategoryStats();
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: inputTerm.trim(), categoryStats }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'エラーが発生しました');
      }

      setResult(data);

      // Auto-save
      const term: Term = {
        id: crypto.randomUUID(),
        term: inputTerm.trim(),
        shortExplanation: data.shortExplanation,
        detailedExplanation: data.detailedExplanation,
        category: data.category,
        createdAt: new Date().toISOString(),
      };
      await saveTerm(term);
      setSavedTerm(term);
      setIsSaved(true);
      const updated = await getTerms();
      setRecentTerms(updated.slice(0, 5));
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
    setIsSaved(false);
  };

  const categoryParts = result?.category?.split('/') || [];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          IT用語を調べる
        </h2>
        <p className="text-slate-500 text-lg">
          分からない用語を入力すると、AIが分かりやすく解説します
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputTerm}
              onChange={e => setInputTerm(e.target.value)}
              placeholder="例: Docker、マイクロサービス、スクラム..."
              className="flex-1 px-5 py-3.5 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputTerm.trim()}
              className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-sm"
            >
              {isLoading ? '生成中...' : '解説を見る'}
            </button>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-slate-700 font-medium">「{inputTerm}」を解析中...</p>
              <p className="text-slate-500 text-sm mt-1">AIが解説と分類を生成しています</p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="text-red-700 font-medium">エラーが発生しました</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && savedTerm && (
        <div className="space-y-4">
          {/* Saved indicator */}
          {isSaved && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-green-700 text-sm font-medium">用語集に保存しました</span>
            </div>
          )}

          {/* Term header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">{savedTerm.term}</h3>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {categoryParts.map((part, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-blue-300 text-sm">/</span>}
                        <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                          {part}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-white/70 hover:text-white text-sm hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ✕ 閉じる
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Short explanation */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">📌</span>
                  かんたん解説
                </h4>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-slate-700 leading-relaxed">{result.shortExplanation}</p>
                </div>
              </div>

              {/* Detailed explanation */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded flex items-center justify-center text-xs">📖</span>
                  詳細解説
                </h4>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{result.detailedExplanation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              別の用語を調べる
            </button>
            <a
              href="/library"
              className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-center"
            >
              用語一覧を見る →
            </a>
          </div>
        </div>
      )}

      {/* Recent terms */}
      {!result && !isLoading && recentTerms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">最近調べた用語</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentTerms.map(term => (
              <button
                key={term.id}
                onClick={() => {
                  setInputTerm(term.term);
                }}
                className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-blue-700 mb-1">{term.term}</div>
                <div className="text-xs text-slate-500 mb-2">{term.category}</div>
                <p className="text-sm text-slate-600 line-clamp-2">{term.shortExplanation}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
