'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Term, CategoryNode } from '@/lib/types';
import { getTerms, deleteTerm, buildCategoryTree } from '@/lib/storage';
import { exportToExcel } from '@/lib/excel';

function getAllTerms(node: CategoryNode): Term[] {
  return [...node.terms, ...node.children.flatMap(getAllTerms)];
}

function TermCard({ term, onDelete }: { term: Term; onDelete: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-gray-800 text-sm leading-snug">{term.term}</h4>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-indigo-500 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            {isExpanded ? '閉じる' : '詳細'}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-300 hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              削除
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => onDelete(term.id)} className="text-xs text-red-600 px-2 py-1 bg-red-50 rounded hover:bg-red-100">確認</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-100 rounded">✕</button>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{term.shortExplanation}</p>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{term.detailedExplanation}</p>
          <p className="text-xs text-gray-300 mt-2">{new Date(term.createdAt).toLocaleDateString('ja-JP')}</p>
        </div>
      )}
    </div>
  );
}

const categoryColors = [
  { border: 'border-indigo-200', bg: 'bg-indigo-50', header: 'bg-indigo-600' },
  { border: 'border-violet-200', bg: 'bg-violet-50', header: 'bg-violet-600' },
  { border: 'border-purple-200', bg: 'bg-purple-50', header: 'bg-purple-600' },
];

function CategoryNodeView({ node, onDelete, depth = 0, searchQuery }: {
  node: CategoryNode; onDelete: (id: string) => void; depth?: number; searchQuery: string;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const c = categoryColors[Math.min(depth, 2)];
  const allTerms = getAllTerms(node);

  if (node.name === 'root') {
    return (
      <div className="space-y-3">
        {node.children.map(child => (
          <CategoryNodeView key={child.fullPath} node={child} onDelete={onDelete} depth={depth} searchQuery={searchQuery} />
        ))}
      </div>
    );
  }

  if (allTerms.length === 0) return null;

  const displayTerms = searchQuery
    ? allTerms.filter(t =>
        t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.shortExplanation.includes(searchQuery) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : node.terms;

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left ${c.header} text-white px-4 py-3 flex items-center justify-between hover:opacity-95`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{isExpanded ? '▾' : '▸'}</span>
          {node.name}
          {node.children.length > 0 && <span className="text-white/60 text-xs font-normal">{node.children.length} サブカテゴリ</span>}
        </div>
        <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{allTerms.length}</span>
      </button>
      {isExpanded && (
        <div className="p-3 space-y-3">
          {displayTerms.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {displayTerms.map(term => <TermCard key={term.id} term={term} onDelete={onDelete} />)}
            </div>
          )}
          {node.children.length > 0 && (
            <div className="space-y-2">
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTerms().then(loadedTerms => {
      setTerms(loadedTerms);
      setCategoryTree(buildCategoryTree(loadedTerms));
      setIsLoading(false);
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
    try { exportToExcel(terms); } finally { setIsExporting(false); }
  };

  // Derive category/subcategory options
  const categories = [...new Set(terms.map(t => t.category.split('/')[0]))].sort();
  const subcategories = categoryFilter
    ? [...new Set(terms.filter(t => t.category.startsWith(categoryFilter)).map(t => t.category.split('/')[1]).filter(Boolean))].sort()
    : [];

  const filteredTerms = terms.filter(t => {
    const matchesSearch = !searchQuery ||
      t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.shortExplanation.includes(searchQuery);
    const matchesCategory = !categoryFilter || t.category.startsWith(categoryFilter);
    const matchesSubcategory = !subcategoryFilter || t.category.includes(`/${subcategoryFilter}`);
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const categoryCount = categoryTree ? categoryTree.children.length : 0;
  const subcategoryCount = categoryTree
    ? categoryTree.children.reduce((n, c) => n + c.children.length, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-3 divide-x divide-gray-200">
          {[
            { label: '登録用語数', value: terms.length },
            { label: 'カテゴリ数', value: categoryCount },
            { label: 'サブカテゴリ数', value: subcategoryCount },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="用語を検索..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setSubcategoryFilter(''); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={subcategoryFilter}
          onChange={e => setSubcategoryFilter(e.target.value)}
          disabled={!categoryFilter}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
        >
          <option value="">すべてのサブカテゴリ</option>
          {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={handleExport}
          disabled={terms.length === 0 || isExporting}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>📊</span>
          {isExporting ? 'エクスポート中...' : 'Excelで出力'}
        </button>
      </div>

      {/* Empty state */}
      {!isLoading && terms.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-gray-600 font-medium mb-1">まだ用語が登録されていません。</p>
          <p className="text-sm text-gray-400">「調べる」タブで用語を検索して保存しましょう。</p>
        </div>
      )}

      {/* Filtered results */}
      {(searchQuery || categoryFilter || subcategoryFilter) && filteredTerms.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredTerms.map(term => <TermCard key={term.id} term={term} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Category tree */}
      {!searchQuery && !categoryFilter && !subcategoryFilter && categoryTree && terms.length > 0 && (
        <CategoryNodeView node={categoryTree} onDelete={handleDelete} depth={0} searchQuery="" />
      )}
    </div>
  );
}
