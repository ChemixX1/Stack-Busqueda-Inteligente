export type Issue = { id: string; title: string; detail: string; category: 'structure' | 'mobile' | 'performance' | 'accessibility' | 'availability' | 'security'; severity: 'high' | 'medium' | 'low'; points: number; sources?: string[] };
export type Contact = { type: 'email' | 'phone' | 'whatsapp'; value: string; source: string };
export type Audit = {
  id: string; url: string; domain: string; name: string; description: string;
  country: string; category: string; status: 'active' | 'unreachable' | 'blocked';
  score: number | null; issues: Issue[]; contacts: Contact[];
  aiEvidence: { detected: boolean; label: string; evidence: string[] };
  metrics: { responseMs: number | null; htmlBytes: number | null; viewport: boolean | null; title: boolean | null; h1: number | null; imageAltMissing: number | null; performance: number | null; accessibility: number | null; wordCount?: number; linkCount?: number; domElements?: number; headingCount?: number; imageCount?: number; blockingScripts?: number };
  checkedAt: string; source: string; limitations: string[]; demo?: boolean;
  previewImage?: string; technologies?: string[]; language?: string; contactScanVersion?: number;
  pageReviews?: { url: string; score: number | null; issueIds: string[]; metrics: Audit['metrics'] }[];
  crawl?: { attempted: number; failed: number; limit: number; limited: boolean };
};
export type Prospect = Audit & { saved?: boolean; stage?: 'new' | 'contacted' | 'replied' | 'closed'; note?: string };
export type SearchInput = { query: string; country: string; category: string; limit?: number; offset?: number };
export type SearchResult = { results: { url: string; title: string; description: string }[]; provider: string; warning?: string; query: string; category?: string };
