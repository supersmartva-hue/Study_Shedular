'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search, ExternalLink, Globe, FileText, GraduationCap,
  Loader2, X, BookOpen, KeyRound, Bot,
  Languages, ChevronDown, BookMarked, Send, Download,
} from 'lucide-react';
import { api } from '../../../lib/api';
import type { SearchResults, SearchItem, BookResult } from '../../../types';

const TYPE_OPTS = [
  { value: 'all',      label: 'All',         Icon: Search        },
  { value: 'web',      label: 'Web',          Icon: Globe         },
  { value: 'handouts', label: 'Handouts',     Icon: FileText      },
  { value: 'papers',   label: 'Past Papers',  Icon: GraduationCap },
  { value: 'books',    label: 'Books',        Icon: BookMarked    },
] as const;

const LANG_OPTS = [
  { value: 'english',    label: 'English'    },
  { value: 'urdu',       label: 'اردو'        },
  { value: 'roman_urdu', label: 'Roman Urdu' },
] as const;

type LangValue = 'english' | 'urdu' | 'roman_urdu';
type TypeValue = 'all' | 'web' | 'handouts' | 'papers' | 'books';

// ─── Setup Banner ────────────────────────────────────────────────────────────
function SetupBanner({ configured, engine }: { configured: boolean | null; engine?: string }) {
  if (configured === null) return null;

  if (configured) {
    const label: Record<string, string> = {
      serper: 'Google via Serper.dev',
      cse:    'Google Custom Search',
      brave:  'Brave Search',
      gemini: 'Google via Gemini',
    };
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        Real web search active — {label[engine ?? ''] ?? 'Google'}
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-3">
      <KeyRound className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-amber-800 space-y-1">
        <p className="font-semibold">No search engine configured — handout results will be limited.</p>
        <p>
          Add a free key to <code className="bg-amber-100 px-1 rounded">apps/api/.env</code> to get direct Google results:
        </p>
        <p>
          <strong>Easiest:</strong> Sign up at <strong>serper.dev</strong> (free, 2500/month, no credit card)
          → copy key → add <code className="bg-amber-100 px-1 rounded">SERPER_API_KEY=your_key</code> → restart server.
        </p>
      </div>
    </div>
  );
}

// ─── Inline Reader ────────────────────────────────────────────────────────────
function InlineReader({ item, onClose }: { item: SearchItem; onClose: () => void }) {
  const isPdf = item.url.toLowerCase().endsWith('.pdf') || item.type === 'handout' || item.type === 'pdf';
  const viewerUrl = isPdf
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(item.url)}&embedded=true`
    : item.url;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
          <p className="text-xs text-slate-400 truncate">{item.url}</p>
        </div>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5" /> Open Original
        </a>
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800">
        <iframe src={viewerUrl} title={item.title} className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}

// ─── Book Reader Modal ────────────────────────────────────────────────────────
function BookReader({ book, onClose }: { book: BookResult; onClose: () => void }) {
  const embedUrl = book.source === 'google_books' && book.id
    ? `https://books.google.com/books?id=${book.id}&lpg=PP1&pg=PP1&output=embed`
    : book.pdfLink
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(book.pdfLink)}&embedded=true`
      : book.previewLink;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{book.title}</p>
          <p className="text-xs text-slate-400">{book.authors.join(', ')}</p>
        </div>
        {book.previewLink && (
          <a href={book.previewLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0">
            <ExternalLink className="w-3.5 h-3.5" /> Open Full
          </a>
        )}
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800">
        <iframe src={embedUrl} title={book.title} className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ item, onRead }: { item: SearchItem; onRead: () => void }) {
  const isPdf = item.url.toLowerCase().endsWith('.pdf')
    || item.type === 'handout'
    || item.type === 'pdf'
    || /filetype:pdf/i.test(item.url);

  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', ''); } catch { return item.url; }
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm hover:border-primary-200 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isPdf && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                PDF
              </span>
            )}
            <p className="text-xs text-slate-400 truncate">{domain}</p>
          </div>
          <h4 className="text-sm font-semibold text-primary-600 line-clamp-2">{item.title}</h4>
          {item.snippet && <p className="text-xs text-slate-600 mt-1 line-clamp-3">{item.snippet}</p>}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onRead}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-xs font-medium transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            {isPdf ? 'Open' : 'Preview'}
          </button>
          {isPdf && (
            <a href={item.url} download target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Visit
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────
function BookCard({ book, onRead }: { book: BookResult; onRead: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm hover:border-primary-200 transition-all flex gap-3">
      {book.thumbnail ? (
        <img src={book.thumbnail} alt={book.title}
          className="w-14 h-20 object-cover rounded-lg flex-shrink-0 border border-slate-100"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-14 h-20 bg-primary-50 rounded-lg flex-shrink-0 flex items-center justify-center border border-slate-100">
          <BookMarked className="w-5 h-5 text-primary-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-primary-600 line-clamp-2 leading-snug">{book.title}</h4>
        {book.authors.length > 0 && (
          <p className="text-xs text-slate-500 mt-0.5">{book.authors.slice(0, 2).join(', ')}</p>
        )}
        {book.description && (
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{book.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {book.publishedDate && (
            <span className="text-xs text-slate-400">{book.publishedDate.slice(0, 4)}</span>
          )}
          {book.pageCount > 0 && (
            <span className="text-xs text-slate-400">· {book.pageCount}p</span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${
            book.source === 'google_books'
              ? 'bg-blue-50 text-blue-500'
              : 'bg-green-50 text-green-600'
          }`}>
            {book.source === 'google_books' ? 'Google Books' : 'Open Library'}
          </span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button onClick={onRead}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-xs font-medium transition-colors">
            <BookOpen className="w-3.5 h-3.5" /> Read
          </button>
          {book.previewLink && (
            <a href={book.previewLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Ask Panel ─────────────────────────────────────────────────────────────
function AskAIPanel({ searchQuery }: { searchQuery: string }) {
  const [question,  setQuestion]  = useState('');
  const [language,  setLanguage]  = useState<LangValue>('english');
  const [answer,    setAnswer]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // Pre-fill question when search query changes
  useEffect(() => {
    if (searchQuery && !answer) setQuestion(searchQuery);
  }, [searchQuery]);

  async function handleAsk(e?: React.FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setAnswer('');
    try {
      const { data } = await api.post('/api/ai/query', { question: q, language });
      setAnswer(data.answer ?? '');
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch {
      toast.error('AI unavailable. Add GEMINI_API_KEY to the server .env.');
    } finally {
      setLoading(false);
    }
  }

  const currentLang = LANG_OPTS.find(l => l.value === language)!;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Ask AI</p>
          <p className="text-xs text-slate-400">Powered by Gemini</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Question input */}
        <form onSubmit={handleAsk} className="flex flex-col gap-2">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
            placeholder="Ask anything about this topic…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-300"
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk(); }}
          />

          {/* Language + Ask row */}
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative flex-shrink-0">
              <button type="button" onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                <Languages className="w-3.5 h-3.5" />
                {currentLang.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden min-w-[130px]">
                  {LANG_OPTS.map(l => (
                    <button key={l.value} type="button"
                      onClick={() => { setLanguage(l.value); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-white/10 transition-colors ${language === l.value ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !question.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        </form>

        {/* Answer */}
        {(loading || answer) && (
          <div ref={answerRef}
            className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {loading && !answer ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating answer…
              </div>
            ) : answer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query,      setQuery]      = useState('');
  const [type,       setType]       = useState<TypeValue>('all');
  const [results,    setResults]    = useState<SearchResults | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [reading,    setReading]    = useState<SearchItem | null>(null);
  const [readingBook,setReadingBook]= useState<BookResult | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [engine,     setEngine]     = useState<string | undefined>();
  const [searched,   setSearched]   = useState('');

  useEffect(() => {
    api.get('/api/search/status')
      .then(r => { setConfigured(r.data.configured); setEngine(r.data.engine); })
      .catch(() => setConfigured(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setSearched(query.trim());
    try {
      const { data } = await api.get('/api/search', { params: { q: query, type } });
      setResults(data.data);
      const total = (data.data.web?.length ?? 0)
        + (data.data.handouts?.length ?? 0)
        + (data.data.papers?.length ?? 0)
        + (data.data.books?.length ?? 0);
      if (total === 0) toast('No results. Try different keywords.', { icon: '🔍' });
    } catch { toast.error('Search failed'); }
    finally  { setLoading(false); }
  }

  const totalResults = results
    ? (results.web?.length ?? 0) + (results.handouts?.length ?? 0)
      + (results.papers?.length ?? 0) + (results.books?.length ?? 0)
    : 0;

  return (
    <>
      {reading     && <InlineReader item={reading} onClose={() => setReading(null)} />}
      {readingBook && <BookReader   book={readingBook} onClose={() => setReadingBook(null)} />}

      <div className="flex gap-6 items-start">
        {/* ── Left: Search results ── */}
        <div className="flex-1 min-w-0">
          <SetupBanner configured={configured} engine={engine} />

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-12 pr-32 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                placeholder="Search topics, books, handouts, past papers…"
              />
              <button type="submit" disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>

            {/* Type filters */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {TYPE_OPTS.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    type === t.value ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <t.Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </form>

          {/* Results */}
          {results && (
            <div>
              <p className="text-xs text-slate-400 mb-4">
                {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searched}"
              </p>

              {results.web && results.web.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> Web Results
                  </h3>
                  <div className="space-y-2">
                    {results.web.map((item, i) => <ResultCard key={i} item={item} onRead={() => setReading(item)} />)}
                  </div>
                </section>
              )}

              {results.handouts && results.handouts.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Handouts & Study Materials
                  </h3>
                  <div className="space-y-2">
                    {results.handouts.map((item, i) => <ResultCard key={i} item={item} onRead={() => setReading(item)} />)}
                  </div>
                </section>
              )}

              {results.papers && results.papers.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5" /> Past Papers & Exams
                  </h3>
                  <div className="space-y-2">
                    {results.papers.map((item, i) => <ResultCard key={i} item={item} onRead={() => setReading(item)} />)}
                  </div>
                </section>
              )}

              {results.books && results.books.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <BookMarked className="w-3.5 h-3.5" /> Books
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.books.map((book, i) => <BookCard key={i} book={book} onRead={() => setReadingBook(book)} />)}
                  </div>
                </section>
              )}

              {totalResults === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No results found. Try different keywords.</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !results && (
            <div className="text-center py-16 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Search for any topic</p>
              <p className="text-xs mt-1">Books, web articles, handouts, and past papers</p>
            </div>
          )}
        </div>

        {/* ── Right: AI Ask Panel ── */}
        <div className="w-72 xl:w-80 flex-shrink-0 sticky top-6">
          <AskAIPanel searchQuery={searched} />
        </div>
      </div>
    </>
  );
}
