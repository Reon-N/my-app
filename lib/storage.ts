import { Term, CategoryNode } from './types';

export async function getTerms(): Promise<Term[]> {
  const res = await fetch('/api/terms');
  if (!res.ok) throw new Error('Failed to fetch terms');
  return res.json();
}

export async function saveTerm(term: Term): Promise<void> {
  const res = await fetch('/api/terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(term),
  });
  if (!res.ok) throw new Error('Failed to save term');
}

export async function deleteTerm(id: string): Promise<void> {
  const res = await fetch(`/api/terms/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete term');
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
      if (idx === parts.length - 1) child.terms.push(term);
      current = child;
    });
  });

  return root;
}
