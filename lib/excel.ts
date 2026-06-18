import * as XLSX from 'xlsx';
import { Term } from './types';

export function exportToExcel(terms: Term[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: All terms
  const allData = [
    ['大分類', '中分類', '小分類', '用語', '短い解説', '詳細解説', '登録日'],
    ...terms.map(t => {
      const parts = t.category.split('/');
      return [
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        t.term,
        t.shortExplanation,
        t.detailedExplanation,
        new Date(t.createdAt).toLocaleDateString('ja-JP'),
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, // 大分類
    { wch: 25 }, // 中分類
    { wch: 25 }, // 小分類
    { wch: 30 }, // 用語
    { wch: 50 }, // 短い解説
    { wch: 80 }, // 詳細解説
    { wch: 12 }, // 登録日
  ];

  XLSX.utils.book_append_sheet(wb, ws, '用語一覧');

  // Sheet 2: Category summary
  const categories = new Map<string, number>();
  terms.forEach(t => {
    const cat = t.category;
    categories.set(cat, (categories.get(cat) || 0) + 1);
  });

  const catData = [
    ['カテゴリ', '用語数'],
    ...[...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => [cat, count]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(catData);
  ws2['!cols'] = [{ wch: 50 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'カテゴリ一覧');

  XLSX.writeFile(wb, `IT用語集_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
