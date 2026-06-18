export interface Term {
  id: string;
  term: string;
  shortExplanation: string;
  detailedExplanation: string;
  category: string; // e.g., "インフラ/クラウドコンピューティング/AWS"
  createdAt: string;
}

export interface CategoryNode {
  name: string;
  fullPath: string;
  children: CategoryNode[];
  terms: Term[];
}

export interface ExplainResponse {
  shortExplanation: string;
  detailedExplanation: string;
  category: string;
}
