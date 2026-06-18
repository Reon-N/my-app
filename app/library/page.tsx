'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Term, CategoryNode } from '@/lib/types';
import { getTerms, deleteTerm, buildCategoryTree } from '@/lib/storage';
import { exportToExcel } from '@/lib/excel';

function getAllTerms(node: CategoryNode): Term[] {
  return [
    ...node.terms,
    ...node.children.flatMap(child => getAllTerms(child)),
  ];
}

function TermCard({ term, onDelete }: { term: Term; onDelete: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:border-indigo-100 hover:shadow-[0_2px_16px_rgba(99,102,241,0.08)] transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-slate-800 text-sm leading-snug">{term.term}</h4>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-indigo-500 text-xs px-2 py-1 hover:bg-indigo-50 rounded-lg transition-all"
            >
              {isExpanded ? '閉じる' : '詳細'}
            </button>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-slate-300 hover:text-red-400 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition-all"
              >
                削除
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => onDelete(term.id)}
                  className="text-red-600 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                >
                  確認
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-slate-400 text-xs px-2 py-1 hover:bg-slate-100 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{term.shortExplanation}</p>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-50">
            <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{term.detailedExplanation}</p>
            <p className="text-xs text-slate-300 mt-2">
              {new Date(term.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const depthStyles = [
  { border: 'border-indigo-100', bg: 'bg-indigo-50/40', header: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
  { border: 'border-violet-100', bg: 'bg-violet-50/40', header: 'bg-gradient-to-r from-violet-500 to-violet-600' },
  { border: 'border-purple-100', bg: 'bg-purple-50/40', header: 'bg-gradient-to-r from-purple-500 to-purple-600' },
];

function CategoryNodeView({
  node,
  onDelete,
  depth = 0,
  searchQuery,
}: {
  node: CategoryNode;
  onDelete: (id: string) => void;
  depth?: number;
  searchQuery: string;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const style = depthStyles[Math.min(depth, depthStyles.length - 1)];

  const allTerms = getAllTerms(node);
  const filteredTerms = searchQuery
    ? allTerms.filter(
        t =>
          t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.shortExplanation.includes(searchQuery) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  if (node.name === 'root') {
    return (
      <div className="space-y-3">
        {node.children.map(child => (
          <CategoryNodeView key={child.fullPath} node={child} onDelete={onDelete} depth={depth} searchQuery={searchQuery} />
        ))}
      </div>
    );
  }

  const termCount = allTerms.length;
  if (termCount === 0) return null;

  const displayTerms = searchQuery ? (filteredTerms || []) : node.terms;

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left ${style.header} text-white px-5 py-3.5 flex items-center justify-between hover:opacity-95 transition-opacity`}
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-sm">{node.name}</span>
          {node.children.length > 0 && (
            <span className="text-white/60 text-xs">{node.children.length} サブカテゴリ</span>
          )}
        </div>
        <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
          {termCount}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {displayTerms.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {displayTerms.map(term => (
                <TermCard key={term.id} term={term} onDelete={onDelete} />
              ))}
            </div>
          )}
          {node.children.length > 0 && (
            <div className="space-y-2.5">
              {node.children.map(child => (
                <CategoryNodeView key={child.fullPath} node={child} onDelete={onDelete} depth={depth + 1} searchQuery={searchQuery} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Library() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getTerms().then(loadedTerms => {
      setTerms(loadedTerms);
      setCategoryTree(buildCategoryTree(loadedTerms));
    });
  }, []);

  const handleDelete = async (id: string) => {
    await deleteTerm(id);
    const updated = await getTerms();
    setTerms(updated);
    setCategoryTree(buildCategoryTree(updated));
  };

  const handleExport = async () => {
    if (terms.length === 0) return;
    setIsExporting(true);
    try {
      exportToExcel(terms);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTerms = searchQuery
    ? terms.filter(
        t =>
          t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.shortExplanation.includes(searchQuery) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : terms;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">用語一覧</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {terms.length} 用語が登録されています
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={terms.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'エクスポート中...' : 'Excel出力'}
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            用語を追加
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="用語・解説・カテゴリで検索..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder-slate-400 shadow-sm transition-all"
        />
        {searchQuery && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {filteredTerms.length} 件
          </div>
        )}
      </div>

      {/* Empty state */}
      {terms.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1.5">用語がまだ登録されていません</h3>
          <p className="text-slate-400 text-sm mb-6">トップページで用語を調べると、自動的に用語集に追加されます</p>
          <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">
            用語を調べる →
          </a>
        </div>
      )}

      {/* Search results */}
      {searchQuery && filteredTerms.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">検索結果</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredTerms.map(term => (
              <div key={term.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{term.term}</h4>
                    <span className="text-xs text-slate-400">{term.category}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(term.id)}
                    className="text-slate-300 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-all"
                  >
                    削除
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{term.shortExplanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category tree */}
      {!searchQuery && categoryTree && terms.length > 0 && (
        <CategoryNodeView node={categoryTree} onDelete={handleDelete} depth={0} searchQuery={searchQuery} />
      )}
    </div>
  );
}
