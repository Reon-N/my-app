import { getSupabase } from './supabase';
import { Term, CategoryNode } from './types';

export async function getTerms(): Promise<Term[]> {
  const { data, error } = await getSupabase()
    .from('terms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    term: row.term,
    shortExplanation: row.short_explanation,
    detailedExplanation: row.detailed_explanation,
    category: row.category,
    createdAt: row.created_at,
  }));
}

export async function saveTerm(term: Term): Promise<void> {
  const { error } = await getSupabase().from('terms').upsert({
    id: term.id,
    term: term.term,
    short_explanation: term.shortExplanation,
    detailed_explanation: term.detailedExplanation,
    category: term.category,
    created_at: term.createdAt,
  });
  if (error) throw error;
}

export async function deleteTerm(id: string): Promise<void> {
  const { error } = await getSupabase().from('terms').delete().eq('id', id);
  if (error) throw error;
}

export async function getCategoryStats(): Promise<Record<string, number>> {
  const terms = await getTerms();
  const stats: Record<string, number> = {};
  terms.forEach(t => {
    const parts = t.category.split('/');
    let path = '';
    parts.forEach(part => {
      path = path ? `${path}/${part}` : part;
      stats[path] = (stats[path] || 0) + 1;
    });
  });
  return stats;
}

export function buildCategoryTree(terms: Term[]): CategoryNode {
  const root: CategoryNode = { name: 'root', fullPath: '', children: [], terms: [] };

  terms.forEach(term => {
    const parts = term.category.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, idx) => {
      const fullPath = parts.slice(0, idx + 1).join('/');
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = { name: part, fullPath, children: [], terms: [] };
        current.children.push(child);
      }
      if (idx === parts.length - 1) {
        child.terms.push(term);
      }
      current = child;
    });
  });

  return root;
}
