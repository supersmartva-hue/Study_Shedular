'use client';
/**
 * StudySearch — embedded book & study-material search panel.
 *
 * Placed on the study item detail page so users can find relevant
 * books / PDFs / articles without leaving the app and save them
 * directly as resources on the study item.
 *
 * API used:
 *   GET /api/search?q=...&type=books     → Google Books + Open Library
 *   GET /api/search?q=...&type=handouts  → PDFs / handouts / articles
 *   POST /api/study/:id/resources        → save as resource
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search, BookMarked, FileText, ExternalLink,
  Plus, Loader2, X, BookOpen, Download, CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { BookResult, SearchItem, Resource } from '../../types';

type Tab = 'books' | 'materials';

interface Props {
  studyItemId:     string;
  initialQuery?:   string;
  onResourceAdded: (res: Resource) => void;
}

// ── Preview modals ─────────────────────────────────────────────────────────────
function BookPreviewModal({ book, onClose }: { book: BookResult; onClose: () => void }) {
  const embedUrl = book.source === 'google_books' && book.id
    ? `https://books.google.com/books?id=${book.id}&lpg=PP1&pg=PP1&output=embed`
    : book.pdfLink
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(book.pdfLink)}&embedded=true`
      : book.previewLink;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{book.title}</p>
          <p className="text-xs text-slate-400">{book.authors.join(', ')}</p>
        </div>
        {book.previewLink && (
          <a
            href={book.previewLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Full
          </a>
        )}
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800" onClick={e => e.stopPropagation()}>
        <iframe
          src={embedUrl}
          title={book.title}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function MaterialPreviewModal({ item, onClose }: { item: SearchItem; onClose: () => void }) {
  const isPdf   = item.url.toLowerCase().includes('.pdf');
  const viewUrl = isPdf
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(item.url)}&embedded=true`
    : item.url;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
          <p className="text-xs text-slate-400 truncate">{item.url}</p>
        </div>
        <a
          href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Original
        </a>
      </div>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800" onClick={e => e.stopPropagation()}>
        <iframe
          src={viewUrl}
          title={item.title}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

// ── Book card ──────────────────────────────────────────────────────────────────
function BookCard({
  book, saved, saving,
  onPreview, onSave,
}: {
  book:      BookResult;
  saved:     boolean;
  saving:    boolean;
  onPreview: () => void;
  onSave:    () => void;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-3 hover:border-primary-200 hover:shadow-sm transition-all">
      {/* Cover */}
      {book.thumbnail ? (
        <img
          src={book.thumbnail} alt={book.title}
          className="w-12 h-[68px] object-cover rounded-lg flex-shrink-0 border border-slate-100"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-12 h-[68px] bg-primary-50 border border-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-primary-300" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 line-clamp-1 leading-snug">{book.title}</p>
            {book.authors.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{book.authors.slice(0, 2).join(', ')}</p>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
            book.source === 'google_books'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}>
            {book.source === 'google_books' ? 'Google Books' : 'Open Library'}
          </span>
        </div>

        {book.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{book.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {book.publishedDate && (
            <span className="text-[10px] text-slate-400">{book.publishedDate.slice(0, 4)}</span>
          )}
          {book.pageCount > 0 && (
            <span className="text-[10px] text-slate-400">· {book.pageCount} pages</span>
          )}
          {book.publisher && (
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">· {book.publisher}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={onPreview}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
          >
            <BookOpen className="w-3 h-3" /> Preview
          </button>
          {book.pdfLink && (
            <a
              href={book.pdfLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3 h-3" /> PDF
            </a>
          )}
          <button
            onClick={onSave}
            disabled={saved || saving}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ml-auto ${
              saved
                ? 'bg-green-50 text-green-600 cursor-default'
                : 'bg-primary-50 hover:bg-primary-100 text-primary-600'
            }`}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
             saved  ? <><CheckCircle2 className="w-3 h-3" /> Saved</> :
                      <><Plus className="w-3 h-3" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Material card ──────────────────────────────────────────────────────────────
function MaterialCard({
  item, saved, saving,
  onPreview, onSave,
}: {
  item:      SearchItem;
  saved:     boolean;
  saving:    boolean;
  onPreview: () => void;
  onSave:    () => void;
}) {
  const isPdf = item.url.toLowerCase().includes('.pdf');
  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', ''); }
    catch { return item.url.slice(0, 30); }
  })();

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 hover:border-primary-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2 mb-1.5">
        {isPdf && (
          <span className="inline-flex px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0 mt-0.5">
            PDF
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 truncate">{domain}</p>
          <p className="text-sm font-semibold text-primary-600 line-clamp-2 leading-snug">{item.title}</p>
        </div>
      </div>

      {item.snippet && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{item.snippet}</p>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={onPreview}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
        >
          <BookOpen className="w-3 h-3" /> {isPdf ? 'Open PDF' : 'Preview'}
        </button>
        {isPdf && (
          <a
            href={item.url} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3 h-3" /> Download
          </a>
        )}
        <button
          onClick={onSave}
          disabled={saved || saving}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ml-auto ${
            saved
              ? 'bg-green-50 text-green-600 cursor-default'
              : 'bg-primary-50 hover:bg-primary-100 text-primary-600'
          }`}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
           saved  ? <><CheckCircle2 className="w-3 h-3" /> Saved</> :
                    <><Plus className="w-3 h-3" /> Save</>}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StudySearch({ studyItemId, initialQuery = '', onResourceAdded }: Props) {
  const [tab,          setTab]         = useState<Tab>('books');
  const [query,        setQuery]       = useState(initialQuery);
  const [books,        setBooks]       = useState<BookResult[]>([]);
  const [materials,    setMaterials]   = useState<SearchItem[]>([]);
  const [loading,      setLoading]     = useState(false);
  const [searched,     setSearched]    = useState('');
  const [previewBook,  setPreviewBook] = useState<BookResult | null>(null);
  const [previewItem,  setPreviewItem] = useState<SearchItem | null>(null);
  const [savingId,     setSavingId]    = useState<string | null>(null);
  const [savedIds,     setSavedIds]    = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-search with the study item title on first render
  useEffect(() => {
    if (initialQuery.trim()) doSearch(initialQuery, 'books');
  }, []);

  async function doSearch(q: string, searchTab: Tab) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(trimmed);
    try {
      const type = searchTab === 'books' ? 'books' : 'handouts';
      const { data } = await api.get('/api/search', { params: { q: trimmed, type } });
      if (searchTab === 'books') {
        setBooks(data.data.books ?? []);
        setMaterials([]);
      } else {
        setMaterials(data.data.handouts ?? []);
        setBooks([]);
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query, tab);
  }

  function switchTab(t: Tab) {
    setTab(t);
    if (query.trim()) doSearch(query, t);
  }

  async function saveBook(book: BookResult) {
    const key = book.id || book.title;
    const url = book.previewLink || book.pdfLink;
    if (!url) { toast.error('No preview link available'); return; }
    setSavingId(key);
    try {
      const { data } = await api.post(`/api/study/${studyItemId}/resources`, {
        type:  'link',
        title: [book.title, book.authors[0]].filter(Boolean).join(' — '),
        url,
      });
      onResourceAdded(data.data);
      setSavedIds(prev => new Set(prev).add(key));
      toast.success('Saved to your resources!');
    } catch {
      toast.error('Could not save resource');
    } finally {
      setSavingId(null);
    }
  }

  async function saveMaterial(item: SearchItem) {
    const key = item.url;
    setSavingId(key);
    try {
      const { data } = await api.post(`/api/study/${studyItemId}/resources`, {
        type:  'link',
        title: item.title,
        url:   item.url,
      });
      onResourceAdded(data.data);
      setSavedIds(prev => new Set(prev).add(key));
      toast.success('Saved to your resources!');
    } catch {
      toast.error('Could not save resource');
    } finally {
      setSavingId(null);
    }
  }

  const hasResults = tab === 'books' ? books.length > 0 : materials.length > 0;

  return (
    <>
      {previewBook && <BookPreviewModal     book={previewBook} onClose={() => setPreviewBook(null)} />}
      {previewItem && <MaterialPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-bold text-slate-800">Find Books & Materials</span>
          </div>
          {searched && hasResults && (
            <span className="text-xs text-slate-400">
              {tab === 'books' ? books.length : materials.length} result{(tab === 'books' ? books.length : materials.length) !== 1 ? 's' : ''} for "{searched}"
            </span>
          )}
        </div>

        <div className="p-4">
          {/* ── Search bar ── */}
          <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by title, author, topic…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </form>

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4 w-fit">
            {([
              { key: 'books',     label: 'Books',     Icon: BookMarked },
              { key: 'materials', label: 'Study PDFs', Icon: FileText  },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {/* ── Results ── */}
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Searching…</span>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-10 text-slate-400">
              <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Search for books and study materials</p>
              <p className="text-xs mt-1 text-slate-400">Save anything directly to this study item's resources</p>
            </div>
          )}

          {!loading && searched && !hasResults && (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results for "{searched}"</p>
              <p className="text-xs mt-1">Try different keywords or switch tabs</p>
            </div>
          )}

          {!loading && tab === 'books' && books.length > 0 && (
            <div className="space-y-2.5">
              {books.map((book, i) => {
                const key = book.id || book.title;
                return (
                  <BookCard
                    key={i}
                    book={book}
                    saved={savedIds.has(key)}
                    saving={savingId === key}
                    onPreview={() => setPreviewBook(book)}
                    onSave={() => saveBook(book)}
                  />
                );
              })}
            </div>
          )}

          {!loading && tab === 'materials' && materials.length > 0 && (
            <div className="space-y-2.5">
              {materials.map((item, i) => (
                <MaterialCard
                  key={i}
                  item={item}
                  saved={savedIds.has(item.url)}
                  saving={savingId === item.url}
                  onPreview={() => setPreviewItem(item)}
                  onSave={() => saveMaterial(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
