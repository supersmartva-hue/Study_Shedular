import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../config/db';
import { env } from '../../config/env';

export interface SearchResult {
  title:   string;
  url:     string;
  snippet: string;
  type:    'web' | 'pdf' | 'handout' | 'paper';
}

export interface BookResult {
  id:            string;
  title:         string;
  authors:       string[];
  description:   string;
  thumbnail:     string;
  previewLink:   string;
  pdfLink:       string;
  publisher:     string;
  publishedDate: string;
  pageCount:     number;
  source:        'google_books' | 'open_library';
}

interface SearchResponse {
  web:      SearchResult[];
  handouts: SearchResult[];
  papers:   SearchResult[];
  books:    BookResult[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function isPdfUrl(url: string) {
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('filetype=pdf');
}

// ─── 1. Serper.dev — real Google results, free 2500/month ────────────────────
async function serperSearch(q: string, num = 8): Promise<SearchResult[]> {
  if (!env.SERPER_API_KEY) return [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q, num }),
      signal:  AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.organic ?? []).slice(0, num).map((item: any) => ({
      title:   item.title   ?? '',
      url:     item.link    ?? '',
      snippet: item.snippet ?? '',
      type:    'web' as const,
    }));
  } catch { return []; }
}

// ─── 2. Brave Search API — free 2000/month, independent real-web index ───────
async function braveSearch(q: string, num = 8): Promise<SearchResult[]> {
  if (!env.BRAVE_API_KEY) return [];
  try {
    const params = new URLSearchParams({ q, count: String(num), search_lang: 'en' });
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'Accept':               'application/json',
        'X-Subscription-Token': env.BRAVE_API_KEY,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.web?.results ?? []).slice(0, num).map((r: any) => ({
      title:   r.title       ?? '',
      url:     r.url         ?? '',
      snippet: r.description ?? '',
      type:    'web' as const,
    }));
  } catch { return []; }
}

// ─── 3. Google Custom Search — free 100/day ──────────────────────────────────
async function googleCSESearch(q: string, opts: { fileType?: string; num?: number } = {}): Promise<SearchResult[]> {
  if (!env.GOOGLE_SEARCH_API_KEY || !env.GOOGLE_SEARCH_CX) return [];
  try {
    const params = new URLSearchParams({
      key: env.GOOGLE_SEARCH_API_KEY,
      cx:  env.GOOGLE_SEARCH_CX,
      q,
      num: String(opts.num ?? 8),
    });
    if (opts.fileType) params.set('fileType', opts.fileType);
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.items ?? []).map((item: any) => ({
      title:   item.title   ?? '',
      url:     item.link    ?? '',
      snippet: item.snippet ?? '',
      type:    'web' as const,
    }));
  } catch { return []; }
}

// ─── 4. Gemini Google Search Grounding — free with GEMINI_API_KEY ─────────────
// Gemini 2.0 Flash has a built-in Google Search tool — one Gemini key covers AI + search.
async function geminiSearch(q: string): Promise<SearchResult[]> {
  if (!env.GEMINI_API_KEY) return [];
  try {
    const genai = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} }] as any,
    });
    const result = await model.generateContent(q);
    const candidate = (result.response as any).candidates?.[0];
    const chunks: any[] = candidate?.groundingMetadata?.groundingChunks ?? [];
    return chunks
      .filter((c: any) => c?.web?.uri)
      .slice(0, 10)
      .map((c: any) => ({
        title:   c.web.title ?? '',
        url:     c.web.uri,
        snippet: '',
        type:    'web' as const,
      }));
  } catch { return []; }
}

// ─── 5. Wikipedia — free, no key (web fallback) ──────────────────────────────
async function wikiSearch(q: string): Promise<SearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&srprop=snippet`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.query?.search ?? []).map((item: any) => ({
      title:   item.title,
      url:     `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      type:    'web' as const,
    }));
  } catch { return []; }
}

// ─── 6. Semantic Scholar — free, no key, academic PDFs ───────────────────────
async function semanticScholarSearch(q: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      query:  q,
      fields: 'title,abstract,openAccessPdf,year,authors',
      limit:  '8',
    });
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, {
      headers: { 'User-Agent': 'study-search-tool/1.0' },
      signal:  AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.data ?? [])
      .filter((p: any) => p.openAccessPdf?.url)
      .slice(0, 6)
      .map((p: any) => ({
        title:   p.title ?? '',
        url:     p.openAccessPdf.url,
        snippet: (p.abstract ?? '').slice(0, 200),
        type:    'paper' as const,
      }));
  } catch { return []; }
}

// ─── 7. arXiv — free, no key ─────────────────────────────────────────────────
async function arxivSearch(q: string): Promise<SearchResult[]> {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const xml     = await res.text();
    const entries: SearchResult[] = [];
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) !== null && entries.length < 5) {
      const block   = m[1];
      const title   = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
      const pdfLink = block.match(/href="(https:\/\/arxiv\.org\/pdf\/[^"]+)"/)?.[1];
      const absLink = block.match(/href="(https:\/\/arxiv\.org\/abs\/[^"]+)"/)?.[1] ?? '';
      const summary = block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 200) ?? '';
      if (title) entries.push({ title, url: pdfLink ?? absLink, snippet: summary, type: 'paper' as const });
    }
    return entries;
  } catch { return []; }
}

// ─── 8. Google Books ──────────────────────────────────────────────────────────
async function googleBooksSearch(q: string): Promise<BookResult[]> {
  try {
    const params = new URLSearchParams({ q, maxResults: '8', printType: 'books' });
    if (env.GOOGLE_BOOKS_API_KEY) params.set('key', env.GOOGLE_BOOKS_API_KEY);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.items ?? []).slice(0, 8).map((item: any): BookResult => {
      const info   = item.volumeInfo ?? {};
      const access = item.accessInfo ?? {};
      const thumb  = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? '';
      return {
        id:            item.id ?? '',
        title:         info.title ?? 'Untitled',
        authors:       info.authors ?? [],
        description:   (info.description ?? '').slice(0, 400),
        thumbnail:     thumb.replace(/^http:/, 'https:'),
        previewLink:   info.previewLink ?? '',
        pdfLink:       access.pdf?.downloadLink ?? access.epub?.downloadLink ?? '',
        publisher:     info.publisher ?? '',
        publishedDate: info.publishedDate ?? '',
        pageCount:     info.pageCount ?? 0,
        source:        'google_books',
      };
    });
  } catch { return []; }
}

// ─── 9. OpenLibrary ──────────────────────────────────────────────────────────
async function openLibrarySearch(q: string): Promise<BookResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6` +
      `&fields=key,title,author_name,first_publish_year,subject,cover_i,ia`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.docs ?? []).slice(0, 6).map((item: any): BookResult => {
      const coverUrl = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '';
      const iaId     = Array.isArray(item.ia) ? item.ia[0] : item.ia;
      const readLink = iaId ? `https://archive.org/details/${iaId}` : '';
      return {
        id:            item.key?.replace('/works/', '') ?? '',
        title:         item.title ?? 'Untitled',
        authors:       item.author_name ?? [],
        description:   (item.subject ?? []).slice(0, 3).join(', '),
        thumbnail:     coverUrl,
        previewLink:   readLink || `https://openlibrary.org${item.key}`,
        pdfLink:       readLink,
        publisher:     '',
        publishedDate: item.first_publish_year ? String(item.first_publish_year) : '',
        pageCount:     0,
        source:        'open_library',
      };
    });
  } catch { return []; }
}

// ─── Detect which Google-class search engine is available ─────────────────────
function googleEngine(): 'serper' | 'cse' | 'brave' | 'gemini' | 'none' {
  if (env.SERPER_API_KEY)                                  return 'serper';
  if (env.GOOGLE_SEARCH_API_KEY && env.GOOGLE_SEARCH_CX)  return 'cse';
  if (env.BRAVE_API_KEY)                                   return 'brave';
  if (env.GEMINI_API_KEY)                                  return 'gemini';
  return 'none';
}

// Run the best available real-web search for the given query
async function realWebSearch(q: string, num = 8): Promise<SearchResult[]> {
  switch (googleEngine()) {
    case 'serper': return serperSearch(q, num);
    case 'cse':    return googleCSESearch(q, { num });
    case 'brave':  return braveSearch(q, num);
    case 'gemini': return geminiSearch(q);
    default:       return wikiSearch(q);
  }
}

// ─── Main search ──────────────────────────────────────────────────────────────
export async function search(
  userId: string,
  query:  string,
  type:   'all' | 'web' | 'handouts' | 'papers' | 'books' = 'all'
): Promise<SearchResponse> {

  const engine = googleEngine();

  const [webRes, handoutsRes, papersRes, booksRes] = await Promise.all([

    // ── Web ──────────────────────────────────────────────────────────────────
    (type === 'all' || type === 'web')
      ? realWebSearch(query)
      : Promise.resolve([]),

    // ── Handouts ─────────────────────────────────────────────────────────────
    (type === 'all' || type === 'handouts')
      ? (async (): Promise<SearchResult[]> => {
          if (engine !== 'none') {
            // Use Google-class engine with PDF-targeted query
            const pdfQuery = `${query} filetype:pdf lecture notes handout`;
            const raw = await realWebSearch(pdfQuery, 10);

            // Prefer actual .pdf URLs but keep all results
            const pdfs  = raw.filter(r => isPdfUrl(r.url));
            const other = raw.filter(r => !isPdfUrl(r.url));
            return [...pdfs, ...other].slice(0, 10);
          }
          // No search key at all — fall back to Semantic Scholar (academic PDFs)
          return semanticScholarSearch(query);
        })()
      : Promise.resolve([]),

    // ── Past Papers ──────────────────────────────────────────────────────────
    (type === 'all' || type === 'papers')
      ? (engine !== 'none'
          ? realWebSearch(`${query} past paper exam paper filetype:pdf`, 8)
          : semanticScholarSearch(query)
        )
      : Promise.resolve([]),

    // ── Books ─────────────────────────────────────────────────────────────────
    (type === 'all' || type === 'books')
      ? Promise.all([googleBooksSearch(query), openLibrarySearch(query)])
          .then(([gb, ol]) => {
            const seen = new Set<string>();
            return [...gb, ...ol].filter(b => {
              const key = b.title.toLowerCase().slice(0, 30);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }).slice(0, 10);
          })
      : Promise.resolve([]),
  ]);

  const results: SearchResponse = {
    web:      webRes.map(r      => ({ ...r, type: 'web'     as const })),
    handouts: handoutsRes.map(r => ({ ...r, type: 'handout' as const })),
    papers:   papersRes.map(r   => ({ ...r, type: 'paper'   as const })),
    books:    booksRes,
  };

  prisma.searchHistory.create({
    data: { userId, query, category: type, results: results as any },
  }).catch(() => {});

  return results;
}

export async function getSearchHistory(userId: string) {
  return prisma.searchHistory.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select:  { id: true, query: true, category: true, createdAt: true },
  });
}

// Expose which engine is active so the frontend can show the right banner
export function getSearchEngine() {
  return googleEngine();
}
