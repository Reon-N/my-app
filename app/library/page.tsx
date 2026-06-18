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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-bold text-slate-800 text-base leading-tight">{term.term}</h4>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 hover:bg-slate-100 rounded transition-colors"
            >
              {isExpanded ? '▲ 閉じる' : '▼ 詳細'}
            </button>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-slate-300 hover:text-red-400 text-xs px-2 py-1 hover:bg-red-50 rounded transition-colors"
              >
                削除
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => onDelete(term.id)}
                  className="text-red-600 hover:text-red-700 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
                >
                  確認
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-slate-500 text-xs px-2 py-1 hover:bg-slate-100 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{term.shortExplanation}</p>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-sm text-slate-500 whitespace-pre-line leading-relaxed">{term.detailedExplanation}</p>
            <p className="text-xs text-slate-400 mt-2">
              登録日: {new Date(term.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
      <div className="space-y-4">
        {node.children.map(child => (
          <CategoryNodeView
            key={child.fullPath}
            node={child}
            onDelete={onDelete}
            depth={depth}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    );
  }

  const termCount = allTerms.length;
  if (termCount === 0) return null;

  const bgColors = [
    'bg-blue-50 border-blue-200',
    'bg-indigo-50 border-indigo-200',
    'bg-violet-50 border-violet-200',
  ];
  const headerColors = [
    'bg-blue-600',
    'bg-indigo-500',
    'bg-violet-500',
  ];
  const bgColor = bgColors[Math.min(depth, bgColors.length - 1)];
  const headerColor = headerColors[Math.min(depth, headerColors.length - 1)];

  const displayTerms = searchQuery ? (filteredTerms || []) : node.terms;

  return (
    <div className={`rounded-xl border ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left ${headerColor} text-white px-4 py-3 flex items-center justify-between hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isExpanded ? '▾' : '▸'}</span>
          <span className="font-semibold">{node.name}</span>
          {node.children.length > 0 && (
            <span className="text-white/70 text-xs">
              ({node.children.length} サブカテゴリ)
            </span>
          )}
        </div>
        <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {termCount} 用語
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Direct terms */}
          {displayTerms.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {displayTerms.map(term => (
                <TermCard key={term.id} term={term} onDelete={onDelete} />
              ))}
            </div>
          )}

          {/* Sub-categories */}
          {node.children.length > 0 && (
            <div className="space-y-3">
              {node.children.map(child => (
                <CategoryNodeView
                  key={child.fullPath}
                  node={child}
                  onDelete={onDelete}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                />
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
          <h2 className="text-2xl font-bold text-slate-800">用語一覧</h2>
          <p className="text-slate-500 text-sm mt-1">
            {terms.length} 用語が登録されています
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={terms.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
          >
            <span>📊</span>
            {isExporting ? 'エクスポート中...' : 'Excelで出力'}
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            <span>🔍</span>
            用語を追加
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="用語・解説・カテゴリで検索..."
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {searchQuery && (
          <p className="text-sm text-slate-500 mt-2">
            {filteredTerms.length} 件が見つかりました
          </p>
        )}
      </div>

      {/* Empty state */}
      {terms.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">用語がまだ登録されていません</h3>
          <p className="text-slate-500 mb-6">トップページで用語を調べると、自動的に用語集に追加されます</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            🔍 用語を調べる
          </a>
        </div>
      )}

      {/* Search results flat view */}
      {searchQuery && filteredTerms.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">検索結果</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTerms.map(term => (
              <div key={term.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800">{term.term}</h4>
                    <span className="text-xs text-slate-500">{term.category}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(term.id)}
                    className="text-slate-300 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                  >
                    削除
                  </button>
                </div>
                <p className="text-sm text-slate-600">{term.shortExplanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category tree */}
      {!searchQuery && categoryTree && terms.length > 0 && (
        <CategoryNodeView
          node={categoryTree}
          onDelete={handleDelete}
          depth={0}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
