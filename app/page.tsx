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
      {/* Hero */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full mb-4 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          AI-Powered Glossary
        </div>
        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
          IT用語を即座に理解する
        </h2>
        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
          分からない用語を入力するだけで、AIが分かりやすい解説と体系的な分類を自動生成します
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100 p-5">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg width="16" height="16" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={inputTerm}
                onChange={e => setInputTerm(e.target.value)}
                placeholder="例: Docker、マイクロサービス、スクラム..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400 bg-slate-50 transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputTerm.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成中
                </span>
              ) : '解説を見る'}
            </button>
          </div>
        </form>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-semibold">「{inputTerm}」を解析中</p>
              <p className="text-slate-400 text-sm mt-1">AIが解説と分類を生成しています...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-red-700 text-sm font-semibold">エラーが発生しました</p>
            <p className="text-red-500 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && savedTerm && (
        <div className="space-y-3">
          {isSaved && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-emerald-700 text-sm font-medium">用語集に保存しました</span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
            {/* Term header */}
            <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{savedTerm.term}</h3>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {categoryParts.map((part, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-white/40 text-xs">›</span>}
                        <span className="bg-white/15 text-white/90 text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                          {part}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Short explanation */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">かんたん解説</span>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/60 rounded-xl p-4">
                  <p className="text-slate-700 text-sm leading-relaxed">{result.shortExplanation}</p>
                </div>
              </div>

              {/* Detailed explanation */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">詳細解説</span>
                </div>
                <p className="text-slate-600 text-sm leading-7 whitespace-pre-line">{result.detailedExplanation}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReset}
              className="py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all"
            >
              別の用語を調べる
            </button>
            <a
              href="/library"
              className="py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all text-center"
            >
              用語一覧を見る →
            </a>
          </div>
        </div>
      )}

      {/* Recent terms */}
      {!result && !isLoading && recentTerms.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">最近調べた用語</h3>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentTerms.map(term => (
              <button
                key={term.id}
                onClick={() => setInputTerm(term.term)}
                className="text-left bg-white rounded-xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-[0_2px_16px_rgba(99,102,241,0.1)] transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{term.term}</span>
                  <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-xs text-slate-400 mb-1.5">{term.category}</div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{term.shortExplanation}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
