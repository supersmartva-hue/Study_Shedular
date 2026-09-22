'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Send, Plus, Bot, User, Trash2, MessageSquare,
  ExternalLink, Loader2, Copy, Check, FileText,
  Sparkles, ChevronDown, History, Upload, Download,
  X, Link, ChevronLeft, Search, Globe,
  Minimize2, Maximize2, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, Menu, BookOpen,
} from 'lucide-react';
import { api } from '../../../lib/api';
import type { AiChat, ChatMessage, StudyItem } from '../../../types';

// ── Types ─────────────────────────────────────────────────────────────────────
type Language = 'english' | 'urdu' | 'roman_urdu';
type Tab       = 'chat' | 'pdf' | 'notes';
type NoteSource = 'topic' | 'pdf';
type NoteMode   = 'full' | 'chapter' | 'page_range' | 'lecture';

interface PdfMeta {
  pageCount: number; charCount: number; filename: string;
  hasChapters: boolean; hasLectures: boolean;
  detectedChapters: string[]; detectedLectures: string[];
}

interface PdfTextData {
  text: string; pageCount: number; filename: string;
  truncated: boolean; charCount: number;
}

interface SearchResultItem {
  title: string; url: string; snippet: string;
  type: 'web' | 'pdf' | 'handout' | 'paper' | 'book';
}

interface NoteHistItem {
  id: string; label: string; source: 'topic' | 'pdf';
  modeLabel: string; createdAt: string; content: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LANGS = [
  { value: 'english',    label: 'English',    rtl: false },
  { value: 'urdu',       label: 'اردو',        rtl: true  },
  { value: 'roman_urdu', label: 'Roman Urdu', rtl: false },
] as const;

const LS_LANG_KEY          = 'ai_language';
const LS_CHAT_SIDEBAR_KEY  = 'ai_chat_sidebar_collapsed';
const NOTES_LS_KEY         = 'ai_notes_history';

const QUICK_CHIPS = [
  { label: 'Explain a concept',    icon: '💡', prompt: 'Explain the concept of: ' },
  { label: 'Practice questions',   icon: '📝', prompt: 'Create 5 practice questions on: ' },
  { label: 'Key points only',      icon: '⚡', prompt: 'Give me the key points to remember about: ' },
  { label: 'Real-world examples',  icon: '🌍', prompt: 'Give real-world examples of: ' },
  { label: 'Compare concepts',     icon: '⚖️', prompt: 'Compare and contrast: ' },
  { label: 'Simplify this',        icon: '🔍', prompt: 'Explain in the simplest possible terms: ' },
];

const PDF_QUICK_ACTIONS = [
  { label: 'Summarize',    prompt: 'Give me a clear summary of this document.' },
  { label: 'Key Concepts', prompt: 'What are the key concepts covered in this document?' },
  { label: 'Outline',      prompt: 'Create a structured outline of this document.' },
  { label: 'Quiz me',      prompt: 'Create 5 quiz questions based on this document.' },
];

const NOTE_MODES: { value: NoteMode; icon: string; label: string; desc: string }[] = [
  { value: 'full',       icon: '📄', label: 'Full PDF',     desc: 'Complete notes from entire document'   },
  { value: 'chapter',    icon: '📑', label: 'Chapter-wise', desc: 'Notes per detected chapter / section'  },
  { value: 'page_range', icon: '📃', label: 'Page Range',   desc: 'Notes from a specific page range only' },
  { value: 'lecture',    icon: '🎓', label: 'Lecture-wise', desc: 'Notes per lecture / week / unit'       },
];

const SEARCH_CATS = [
  { value: 'all',      label: 'All'      },
  { value: 'web',      label: 'Web'      },
  { value: 'handouts', label: 'Handouts' },
  { value: 'papers',   label: 'Papers'   },
  { value: 'books',    label: 'Books'    },
] as const;

// ── SSE helpers ───────────────────────────────────────────────────────────────
function sseStream(url: string, body: object, token: string | null) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return fetch(`${base}${url}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  });
}

async function readSseStream(
  res: Response,
  onDelta: (d: string) => void,
): Promise<{ noteId?: string; chatTitle?: string; sources?: SearchResultItem[] }> {
  if (!res.body) throw new Error('No response body');
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let meta: { noteId?: string; chatTitle?: string; sources?: SearchResultItem[] } = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      let ev: Record<string, unknown> = {};
      try { ev = JSON.parse(line.slice(6)); } catch { continue; }
      if (ev.error) throw new Error(ev.error as string);
      if (ev.delta)   onDelta(ev.delta as string);
      if (ev.sources) meta.sources = ev.sources as SearchResultItem[];
      if (ev.done)    meta = { ...meta, noteId: ev.noteId as string, chatTitle: ev.chatTitle as string };
    }
  }
  return meta;
}

function formatDate(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Notes history helpers ─────────────────────────────────────────────────────
function readNotesHistory(): NoteHistItem[] {
  try { return JSON.parse(localStorage.getItem(NOTES_LS_KEY) ?? '[]'); } catch { return []; }
}

function pushNoteHistory(item: Omit<NoteHistItem, 'id' | 'createdAt'>): NoteHistItem[] {
  const entry: NoteHistItem = { ...item, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
  const updated = [entry, ...readNotesHistory()].slice(0, 20);
  try { localStorage.setItem(NOTES_LS_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function inlineMarkdown(text: string, kp: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const k = `${kp}-${m.index}`;
    if (m[2])      parts.push(<strong key={k}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={k} className="font-semibold">{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={k}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={k} className="bg-black/10 px-1 py-0.5 rounded text-[11px] font-mono">{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text, isUser = false }: { text: string; isUser?: boolean }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let listBuf: { content: string; ordered: boolean }[] = [];
  let listOrd = false;

  function flushList() {
    if (!listBuf.length) return;
    const items = listBuf.map((it, j) => (
      <li key={j} className="leading-relaxed">{inlineMarkdown(it.content, `li-${blocks.length}-${j}`)}</li>
    ));
    blocks.push(listOrd
      ? <ol key={blocks.length} className="list-decimal pl-5 my-2 space-y-0.5 text-sm">{items}</ol>
      : <ul key={blocks.length} className="list-disc pl-5 my-2 space-y-0.5 text-sm">{items}</ul>
    );
    listBuf = [];
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushList();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      blocks.push(
        <pre key={blocks.length} className={`rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap ${isUser ? 'bg-white/20' : 'bg-slate-800 text-slate-100'}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; continue;
    }
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      flushList(); blocks.push(<hr key={blocks.length} className="my-3 border-slate-200 opacity-50" />); i++; continue;
    }
    const h1m = line.match(/^# (.+)/);
    const h2m = line.match(/^## (.+)/);
    const h3m = line.match(/^### (.+)/);
    if (h1m) { flushList(); blocks.push(<h2 key={blocks.length} className="font-bold text-base mt-4 mb-1.5">{h1m[1]}</h2>); i++; continue; }
    if (h2m) { flushList(); blocks.push(<h3 key={blocks.length} className="font-semibold mt-3 mb-1">{h2m[1]}</h3>); i++; continue; }
    if (h3m) { flushList(); blocks.push(<h4 key={blocks.length} className="font-semibold text-sm mt-2.5 mb-1">{h3m[1]}</h4>); i++; continue; }
    const ulm = line.match(/^[-*+] (.+)/);
    const olm = line.match(/^\d+\. (.+)/);
    if (ulm) { if (listBuf.length && listOrd) flushList(); listOrd = false; listBuf.push({ content: ulm[1], ordered: false }); i++; continue; }
    if (olm) { if (listBuf.length && !listOrd) flushList(); listOrd = true; listBuf.push({ content: olm[1], ordered: true }); i++; continue; }
    flushList();
    if (line.trim() === '') { i++; continue; }
    blocks.push(<p key={blocks.length} className="text-sm leading-relaxed">{inlineMarkdown(line, `p-${blocks.length}`)}</p>);
    i++;
  }
  flushList();
  return <div className="space-y-1">{blocks}</div>;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Copy failed'); }
  }
  return (
    <button onClick={doCopy} title="Copy"
      className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  );
}

// ── Search Drawer (Google Search panel in chat) ───────────────────────────────
function SearchDrawer({
  open, onClose, onAddToChat,
}: {
  open: boolean;
  onClose: () => void;
  onAddToChat: (text: string) => void;
}) {
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState<typeof SEARCH_CATS[number]['value']>('all');
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState<SearchResultItem[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/search', { params: { q: query.trim(), type: category } });
      const sr = data.data;
      const combined: SearchResultItem[] = [
        ...(sr.web      ?? []),
        ...(sr.handouts ?? []),
        ...(sr.papers   ?? []),
        ...(sr.books    ?? []).map((b: any) => ({
          title:   b.title,
          url:     b.previewLink || b.pdfLink || '',
          snippet: [b.authors?.join(', '), b.description?.slice(0, 150)].filter(Boolean).join(' — '),
          type:    'book' as const,
        })),
      ].slice(0, 12);
      setResults(combined);
      setSearched(true);
    } catch {
      toast.error('Search failed. Check if a search API key is configured.');
    } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className="border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 flex-shrink-0 max-h-72 overflow-y-auto">
      <div className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Google Search</span>
          </div>
          <button onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-1 flex-wrap">
          {SEARCH_CATS.map(cat => (
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors ${
                category === cat.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-white/10'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search handouts, papers, web content…"
            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button type="submit" disabled={loading || !query.trim()}
            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>

        {/* Results */}
        {searched && results.length === 0 && !loading && (
          <p className="text-xs text-slate-400 text-center py-2">No results found. Try a different query.</p>
        )}
        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-white/10 hover:border-primary-200 dark:hover:border-primary-700/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
                      r.type === 'book'    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' :
                      r.type === 'paper'  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' :
                      r.type === 'handout'? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' :
                      r.type === 'pdf'    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-300'
                    }`}>{r.type}</span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">{r.title}</p>
                  </div>
                  {r.snippet && (
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{r.snippet}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-primary-500 transition-colors"
                      title="Open link">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      onAddToChat(`[${r.title}] ${r.snippet}${r.url ? ` (source: ${r.url})` : ''}`);
                      onClose();
                    }}
                    className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-600 transition-colors"
                    title="Add to chat as context">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== Chat Panel =====================
function ChatPanel({ language }: { language: Language }) {
  const [chats,      setChats]      = useState<AiChat[]>([]);
  const [activeChat, setActiveChat] = useState<AiChat | null>(null);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [streaming,  setStreaming]  = useState(false);
  const [setupError, setSetupError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(LS_CHAT_SIDEBAR_KEY) === 'true'; } catch { return false; }
  });
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [minimized,   setMinimized]   = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRtl = language === 'urdu';

  useEffect(() => { fetchChats(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem(LS_CHAT_SIDEBAR_KEY, String(next)); } catch {}
  }

  async function fetchChats() {
    try {
      const { data } = await api.get('/api/ai/chats');
      const list: AiChat[] = data.data ?? [];
      setChats(list);
      if (list.length > 0) openChat(list[0]);
    } catch { toast.error('Could not load chats'); }
  }

  async function newChat() {
    try {
      const { data } = await api.post('/api/ai/chats', {});
      const chat: AiChat = { ...data.data, messages: [] };
      setChats(prev => [chat, ...prev]);
      setActiveChat(chat);
      setMessages([]);
      setSetupError('');
      setMobileSidebarOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch { toast.error('Could not create chat'); }
  }

  async function openChat(chat: AiChat) {
    try {
      const { data } = await api.get(`/api/ai/chats/${chat.id}`);
      setActiveChat(data.data);
      setMessages(data.data.messages as ChatMessage[]);
      setSetupError('');
      setMobileSidebarOpen(false);
    } catch { toast.error('Could not load chat'); }
  }

  async function deleteChat(id: string) {
    try {
      await api.delete(`/api/ai/chats/${id}`);
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChat?.id === id) { setActiveChat(null); setMessages([]); }
      toast.success('Chat deleted');
    } catch { toast.error('Could not delete chat'); }
  }

  function addSearchResultToInput(text: string) {
    setInput(prev => prev ? `${prev}\n\nContext: ${text}` : `Context: ${text}\n\nMy question: `);
    textareaRef.current?.focus();
  }

  async function sendMessage() {
    if (!input.trim() || !activeChat || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim(), ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setSetupError('');
    let assistantContent = '';
    const placeholder: ChatMessage = { role: 'assistant', content: '', ts: new Date().toISOString() };
    setMessages(prev => [...prev, placeholder]);

    try {
      const token = localStorage.getItem('access_token');
      const res   = await sseStream(`/api/ai/chats/${activeChat.id}/message`, { content: userMsg.content, language }, token);
      if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
      const meta = await readSseStream(res, d => {
        assistantContent += d;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: assistantContent };
          return next;
        });
      });
      if (meta.chatTitle) {
        setActiveChat(prev => prev ? { ...prev, title: meta.chatTitle! } : prev);
        setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, title: meta.chatTitle!, updatedAt: new Date().toISOString() } : c));
      } else { fetchChats(); }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg) { setMessages(prev => prev.slice(0, -1)); setSetupError(msg); }
      else toast.error('AI error');
    } finally { setStreaming(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Minimized state ──────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div className="flex items-center gap-3 h-14 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
        <Bot className="w-4 h-4 text-primary-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">
          {activeChat?.title || 'AI Chat'}
        </span>
        <button onClick={() => setMinimized(false)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors"
          title="Expand chat">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3 min-h-0">
      {/* Chat history sidebar — desktop collapsed */}
      {sidebarCollapsed && (
        <aside className="hidden sm:flex w-12 flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex-shrink-0 items-center py-2 gap-1.5">
          <button onClick={newChat} title="New Chat"
            className="p-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={toggleSidebar} title="Expand sidebar"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Chat history sidebar — desktop expanded */}
      {!sidebarCollapsed && (
        <aside className="hidden sm:flex w-48 flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex-shrink-0">
          <div className="p-2.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-1.5">
            <button onClick={newChat}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
            <button onClick={toggleSidebar} title="Collapse sidebar"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors flex-shrink-0">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chats.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 px-2 leading-relaxed">
                Conversations appear here
              </p>
            )}
            {chats.map(c => (
              <div key={c.id} onClick={() => openChat(c)}
                className={`group flex items-start justify-between px-2.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  activeChat?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}>
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 opacity-60 mt-0.5 ${activeChat?.id === c.id ? 'text-primary-500' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate leading-snug ${activeChat?.id === c.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {c.title || 'New conversation'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(c.updatedAt)}</p>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteChat(c.id); }}
                  className="hidden group-hover:flex p-0.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5 ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="sm:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="sm:hidden fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-white/5 shadow-xl overflow-y-auto">
            <div className="p-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
              <button onClick={newChat}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> New Chat
              </button>
              <button onClick={() => setMobileSidebarOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {chats.map(c => (
                <div key={c.id} onClick={() => openChat(c)}
                  className={`group flex items-start justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                    activeChat?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}>
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 opacity-60 mt-0.5 ${activeChat?.id === c.id ? 'text-primary-500' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.title || 'New conversation'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.updatedAt)}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteChat(c.id); }}
                    className="hidden group-hover:flex p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden min-w-0">
        {!activeChat ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI Study Assistant</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[260px] leading-relaxed">
                Ask anything — concepts, summaries, practice questions, or quizzes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {QUICK_CHIPS.map(chip => (
                <button key={chip.label}
                  onClick={async () => { await newChat(); setInput(chip.prompt); textareaRef.current?.focus(); }}
                  className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-slate-200 dark:border-white/10 hover:border-primary-300 text-slate-600 dark:text-slate-300 hover:text-primary-700 px-3 py-1.5 rounded-full transition-colors">
                  <span>{chip.icon}</span> {chip.label}
                </button>
              ))}
            </div>
            <button onClick={newChat}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Start New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 flex-shrink-0 flex items-center gap-2">
              <button onClick={() => setMobileSidebarOpen(true)}
                className="sm:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
                <Menu className="w-4 h-4" />
              </button>
              <MessageSquare className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">
                {activeChat.title || 'New conversation'}
              </p>
              <button onClick={() => setMinimized(true)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                title="Minimize chat">
                <Minimize2 className="w-4 h-4" />
              </button>
              <button onClick={newChat}
                className="sm:hidden flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors flex-shrink-0">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {setupError && (
              <div className="mx-4 mt-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex-shrink-0">
                {setupError}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 && !setupError && (
                <div className="py-6">
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-3">Pick a prompt or type your own</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_CHIPS.map(chip => (
                      <button key={chip.label} onClick={() => { setInput(chip.prompt); textareaRef.current?.focus(); }}
                        className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-slate-200 dark:border-white/10 hover:border-primary-300 text-slate-600 dark:text-slate-300 hover:text-primary-700 px-3 py-1.5 rounded-full transition-colors">
                        <span>{chip.icon}</span> {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary-600 dark:text-primary-300" />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white rounded-tr-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                  }`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {msg.content
                      ? (msg.role === 'assistant'
                          ? <Markdown text={msg.content} />
                          : <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>)
                      : (streaming && i === messages.length - 1 && msg.role === 'assistant'
                          ? <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse rounded-sm" />
                          : <span className="text-sm opacity-50">…</span>)
                    }
                  </div>
                  {msg.role === 'assistant' && msg.content && (
                    <div className="self-start mt-0.5"><CopyBtn text={msg.content} /></div>
                  )}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Google Search drawer */}
            <SearchDrawer
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
              onAddToChat={addSearchResultToInput}
            />

            {/* Input area */}
            <div className="p-3 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <button
                  onClick={() => setSearchOpen(v => !v)}
                  title="Search Google"
                  className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                    searchOpen
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  <Search className="w-4 h-4" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={isRtl ? 'اپنا سوال یہاں لکھیں…' : 'Ask a question… (Enter to send, Shift+Enter for newline)'}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  disabled={streaming}
                />
                <button onClick={sendMessage} disabled={streaming || !input.trim()}
                  className="p-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0">
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Press 🔍 to search Google and add results as context
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== PDF + Ask AI Panel =====================
function PdfAskAiPanel({ language }: { language: Language }) {
  const [pdfFile,      setPdfFile]      = useState<File | null>(null);
  const [blobUrl,      setBlobUrl]      = useState<string | null>(null);
  const [fileName,     setFileName]     = useState('');
  const [pdfTextData,  setPdfTextData]  = useState<PdfTextData | null>(null);
  const [extracting,   setExtracting]   = useState(false);
  const [extractError, setExtractError] = useState('');
  const [dragging,     setDragging]     = useState(false);
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [input,        setInput]        = useState('');
  const [streaming,    setStreaming]    = useState(false);
  const [layoutMode,   setLayoutMode]   = useState<'split' | 'pdf' | 'chat'>('split');
  const [mobileView,   setMobileView]   = useState<'pdf' | 'chat'>('pdf');
  const [streamSecs,   setStreamSecs]   = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const isRtl = language === 'urdu';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }; }, [blobUrl]);
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (streaming) { setStreamSecs(0); t = setInterval(() => setStreamSecs(s => s + 1), 1000); }
    return () => clearInterval(t);
  }, [streaming]);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setExtractError('Please select a PDF file.');
      return;
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    setFileName(file.name);
    setPdfFile(file);
    setExtractError('');
    setPdfTextData(null);
    setMessages([]);
    setExtracting(true);
    setMobileView('chat');

    const fd    = new FormData();
    fd.append('pdf', file);
    const base  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');

    try {
      const res  = await fetch(`${base}/api/ai/pdf-text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to extract PDF text');
      setPdfTextData(data.data);
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract PDF text');
    } finally {
      setExtracting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function sendMessage(msgContent?: string) {
    const content = msgContent ?? input.trim();
    if (!content || streaming || !pdfTextData) return;
    if (!msgContent) setInput('');

    const userMsg: ChatMessage = { role: 'user', content, ts: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const placeholder: ChatMessage = { role: 'assistant', content: '', ts: new Date().toISOString() };
    setMessages(prev => [...prev, placeholder]);

    try {
      const token = localStorage.getItem('access_token');
      const res   = await sseStream('/api/ai/context-chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        context:  pdfTextData.text,
        language,
      }, token);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let assistantContent = '';
      await readSseStream(res, d => {
        assistantContent += d;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: assistantContent };
          return next;
        });
      });
    } catch (err: any) {
      toast.error(err.message || 'AI error');
      setMessages(prev => prev.slice(0, -1));
    } finally { setStreaming(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function clearPdf() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null); setPdfFile(null); setFileName('');
    setPdfTextData(null); setMessages([]); setExtractError('');
    setLayoutMode('split'); setMobileView('pdf');
  }

  const hasPdf = !!blobUrl;

  // Mobile: mobileView toggle controls visibility. Desktop (sm+): pdfHidden controls PDF panel.
  // When no PDF: always show the PDF panel (upload UI), hide chat panel.
  // When PDF loaded: mobile uses mobileView toggle, desktop uses pdfHidden.
  const pdfPanelCls = !hasPdf
    ? 'flex flex-1'
    : [
        mobileView === 'pdf' ? 'flex flex-1' : 'hidden',
        layoutMode === 'pdf'   ? 'sm:flex sm:flex-1'   :
        layoutMode === 'split' ? 'sm:flex sm:flex-[3]'  :
        'sm:hidden',
      ].join(' ');

  const chatPanelCls = !hasPdf
    ? 'hidden'
    : [
        mobileView === 'chat' ? 'flex flex-1' : 'hidden',
        layoutMode === 'chat'  ? 'sm:flex sm:flex-1'     :
        layoutMode === 'split' ? 'sm:flex sm:w-[400px]'  :
        'sm:hidden',
      ].join(' ');

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Mobile view toggle */}
      {hasPdf && (
        <div className="flex sm:hidden items-center gap-1 mb-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5 p-1 flex-shrink-0">
          <button onClick={() => setMobileView('pdf')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileView === 'pdf' ? 'bg-primary-500 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>
            <FileText className="w-4 h-4" /> View PDF
          </button>
          <button onClick={() => setMobileView('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileView === 'chat' ? 'bg-primary-500 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>
            <Bot className="w-4 h-4" /> Ask AI
          </button>
        </div>
      )}

      <div className="flex-1 flex gap-3 min-h-0">

        {/* PDF Viewer */}
        <div className={`flex-col min-h-0 ${pdfPanelCls}`}>
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col min-h-0">
            {!hasPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                <div className="w-full max-w-md space-y-5">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 mb-3">
                      <FileText className="w-7 h-7 text-primary-500" />
                    </div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Open PDF from Browser</h2>
                    <p className="text-xs text-slate-400 mt-1">Upload to read, then Ask AI about the content</p>
                  </div>

                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                      dragging
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-white/10 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                    <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragging ? 'text-primary-500' : 'text-slate-300 dark:text-slate-600'}`} />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {dragging ? 'Drop your PDF here' : 'Click or drag & drop a PDF'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Text-based PDFs only</p>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                  </div>

                  {extractError && <p className="text-xs text-red-500 text-center">{extractError}</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">{fileName}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Layout mode toggle — PDF / Split / AI */}
                    <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-px mr-0.5">
                      {(['pdf', 'split', 'chat'] as const).map(mode => (
                        <button key={mode} onClick={() => setLayoutMode(mode)}
                          title={mode === 'pdf' ? 'PDF only' : mode === 'split' ? 'Split view' : 'AI chat only'}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            layoutMode === mode
                              ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-300 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}>
                          {mode === 'pdf' ? 'PDF' : mode === 'split' ? 'Split' : 'AI'}
                        </button>
                      ))}
                    </div>
                    {blobUrl && (
                      <a href={blobUrl} download={fileName}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                        title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a href={blobUrl!} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                      title="Open in new tab">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={clearPdf}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                      title="Close PDF">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <iframe src={blobUrl!} title={fileName} className="w-full h-full border-0" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ask AI panel */}
        <div className={`flex-col min-h-0 ${chatPanelCls}`}>
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden min-h-0">

            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 flex-shrink-0 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">Ask AI</p>
              {pdfTextData && (
                <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                  PDF ready
                </span>
              )}
              {hasPdf && (
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-px">
                  {(['pdf', 'split', 'chat'] as const).map(mode => (
                    <button key={mode} onClick={() => setLayoutMode(mode)}
                      title={mode === 'pdf' ? 'PDF only' : mode === 'split' ? 'Split view' : 'AI chat only'}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        layoutMode === mode
                          ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-300 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}>
                      {mode === 'pdf' ? 'PDF' : mode === 'split' ? 'Split' : 'AI'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* States */}
            {!hasPdf && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Upload a PDF to start</p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] leading-relaxed">
                    The AI will answer questions based on your document's content.
                  </p>
                </div>
              </div>
            )}

            {hasPdf && extracting && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Reading PDF content…</p>
                  <p className="text-xs text-slate-400 mt-1">Preparing document for AI analysis</p>
                </div>
              </div>
            )}

            {hasPdf && !extracting && extractError && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <X className="w-10 h-10 mx-auto mb-3 text-red-400" />
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">{extractError}</p>
                  <p className="text-xs text-slate-400 mt-1">Only text-based PDFs are supported</p>
                </div>
              </div>
            )}

            {hasPdf && !extracting && !extractError && pdfTextData && (
              <>
                {/* Quick action chips */}
                {messages.length === 0 && (
                  <div className="px-3 pt-3 pb-0 flex-shrink-0">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Try these:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PDF_QUICK_ACTIONS.map(action => (
                        <button key={action.label} onClick={() => sendMessage(action.prompt)} disabled={streaming}
                          className="text-xs bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-slate-200 dark:border-white/10 hover:border-primary-300 text-slate-600 dark:text-slate-300 hover:text-primary-700 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50">
                          {action.label}
                        </button>
                      ))}
                    </div>
                    {pdfTextData.truncated && (
                      <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-2 flex items-center gap-1">
                        ⚠ Large PDF: AI uses the first portion of text ({pdfTextData.pageCount} pages, {Math.round(pdfTextData.charCount / 1000)}k chars)
                      </p>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {streaming && streamSecs > 3 && (
                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-1">
                      AI is thinking… {streamSecs}s
                      {streamSecs > 15 && ' (Pollinations can be slow — add a Gemini API key for fast responses)'}
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-primary-600 dark:text-primary-300" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-primary-500 text-white rounded-tr-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                      }`} dir={isRtl ? 'rtl' : 'ltr'}>
                        {msg.content
                          ? (msg.role === 'assistant'
                              ? <Markdown text={msg.content} />
                              : <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>)
                          : (streaming && i === messages.length - 1 && msg.role === 'assistant'
                              ? <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse rounded-sm" />
                              : <span className="text-sm opacity-50">…</span>)
                        }
                      </div>
                      {msg.role === 'assistant' && msg.content && (
                        <div className="self-start mt-0.5"><CopyBtn text={msg.content} /></div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder={isRtl ? 'دستاویز کے بارے میں سوال پوچھیں…' : 'Ask about this document…'}
                      dir={isRtl ? 'rtl' : 'ltr'}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      disabled={streaming}
                    />
                    <button onClick={() => sendMessage()} disabled={streaming || !input.trim()}
                      className="p-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0">
                      {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== Notes Panel =====================
function NotesPanel({ language }: { language: Language }) {
  const [source,       setSource]       = useState<NoteSource>('topic');
  const [topic,        setTopic]        = useState('');
  const [pdfFile,      setPdfFile]      = useState<File | null>(null);
  const [pdfMeta,      setPdfMeta]      = useState<PdfMeta | null>(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [mode,         setMode]         = useState<NoteMode>('full');
  const [pageFrom,     setPageFrom]     = useState(1);
  const [pageTo,       setPageTo]       = useState(1);
  const [studyItemId,  setStudyItemId]  = useState('');
  const [studyItems,   setStudyItems]   = useState<StudyItem[]>([]);
  const [notes,        setNotes]        = useState('');
  const [streaming,    setStreaming]    = useState(false);
  const [savedNoteId,  setSavedNoteId]  = useState<string | null>(null);
  const [error,        setError]        = useState('');
  const [notesHistory, setNotesHistory] = useState<NoteHistItem[]>([]);
  const [activeHistId, setActiveHistId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const accRef       = useRef('');

  useEffect(() => {
    api.get('/api/study').then(r => setStudyItems(r.data.data ?? [])).catch(() => {});
    setNotesHistory(readNotesHistory());
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes]);

  function resetOutput() { setNotes(''); setError(''); setSavedNoteId(null); accRef.current = ''; }
  function switchSource(s: NoteSource) { setSource(s); resetOutput(); }

  function loadFromHistory(item: NoteHistItem) {
    setNotes(item.content);
    setActiveHistId(item.id);
    setError(''); setSavedNoteId(null);
    if (item.source === 'topic') setTopic(item.label);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return; }
    setPdfFile(file); setPdfMeta(null); setAnalyzing(true); resetOutput();
    const fd    = new FormData();
    fd.append('pdf', file);
    const base  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    try {
      const r    = await fetch(`${base}/api/ai/parse-pdf`, {
        method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` }, body: fd,
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Failed to analyse PDF');
      const meta: PdfMeta = data.data;
      setPdfMeta(meta);
      setPageFrom(1); setPageTo(meta.pageCount);
      setMode(meta.hasLectures ? 'lecture' : meta.hasChapters ? 'chapter' : 'full');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyse PDF');
      setPdfFile(null);
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function clearPdf() { setPdfFile(null); setPdfMeta(null); resetOutput(); }

  async function generateFromTopic() {
    if (!topic.trim() || streaming) return;
    setStreaming(true); resetOutput(); setActiveHistId(null);
    try {
      const token = localStorage.getItem('access_token');
      const res   = await sseStream('/api/ai/generate-notes', {
        topic: topic.trim(), studyItemId: studyItemId || undefined, language,
      }, token);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const meta = await readSseStream(res, d => { accRef.current += d; setNotes(prev => prev + d); });
      if (meta.noteId) setSavedNoteId(meta.noteId);
      if (accRef.current) {
        setNotesHistory(pushNoteHistory({ label: topic.trim(), source: 'topic', modeLabel: 'Topic', content: accRef.current }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate notes');
    } finally { setStreaming(false); }
  }

  async function generateFromPdf() {
    if (!pdfFile || !pdfMeta || streaming) return;
    setStreaming(true); resetOutput(); setActiveHistId(null);
    const fd = new FormData();
    fd.append('pdf', pdfFile);
    fd.append('mode', mode);
    fd.append('language', language);
    if (studyItemId) fd.append('studyItemId', studyItemId);
    if (mode === 'page_range') { fd.append('pageFrom', String(pageFrom)); fd.append('pageTo', String(pageTo)); }
    const base  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${base}/api/ai/generate-notes-pdf`, {
        method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` }, body: fd,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || `Server error ${res.status}`); }
      const meta = await readSseStream(res, d => { accRef.current += d; setNotes(prev => prev + d); });
      if (meta.noteId) setSavedNoteId(meta.noteId);
      if (accRef.current) {
        setNotesHistory(pushNoteHistory({
          label: pdfFile.name, source: 'pdf',
          modeLabel: NOTE_MODES.find(m => m.value === mode)?.label ?? mode,
          content: accRef.current,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate notes from PDF');
    } finally { setStreaming(false); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (source === 'topic') generateFromTopic(); else generateFromPdf();
  }

  function handleDownload() {
    if (!notes) return;
    const slug = source === 'pdf'
      ? (pdfFile?.name.replace(/\.pdf$/i, '') ?? 'notes')
      : topic.replace(/[^a-z0-9]/gi, '-').slice(0, 40) || 'notes';
    const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${slug}-notes.md`; a.click();
    URL.revokeObjectURL(url);
  }

  const canGenerate  = source === 'topic' ? topic.trim().length > 0 : (!!pdfFile && !!pdfMeta);
  const selectedItem = studyItems.find(s => s.id === studyItemId);

  return (
    <div className="flex h-full">
      {/* History sidebar */}
      <aside className="w-48 flex-col border-r border-slate-100 dark:border-white/5 flex-shrink-0 overflow-hidden hidden sm:flex">
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">History</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {notesHistory.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6 px-2 leading-relaxed">Generated notes will appear here</p>
          )}
          {notesHistory.map(item => {
            const isActive = activeHistId === item.id;
            return (
              <button key={item.id} onClick={() => loadFromHistory(item)}
                className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                <p className={`text-xs font-medium truncate leading-snug ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    item.source === 'pdf'
                      ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/30'
                      : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30'
                  }`}>{item.modeLabel}</span>
                  <span className="text-[10px] text-slate-400 truncate">{formatDate(item.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
        {notesHistory.length > 0 && (
          <div className="p-2 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={() => { try { localStorage.removeItem(NOTES_LS_KEY); } catch {} setNotesHistory([]); setActiveHistId(null); }}
              className="w-full text-[10px] text-slate-400 hover:text-red-500 py-1 transition-colors">
              Clear history
            </button>
          </div>
        )}
      </aside>

      {/* Main form + output */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <form onSubmit={handleSubmit} className="border-b border-slate-100 dark:border-white/5 flex-shrink-0">
          <div className="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap">
            {(['topic', 'pdf'] as NoteSource[]).map(s => (
              <button key={s} type="button" disabled={streaming} onClick={() => switchSource(s)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  source === s ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}>
                {s === 'topic' ? <><FileText className="w-3.5 h-3.5" /> By Topic</> : <><Upload className="w-3.5 h-3.5" /> PDF Upload</>}
              </button>
            ))}
          </div>

          <div className="px-4 pb-3 space-y-2.5">
            {source === 'topic' ? (
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, French Revolution, Recursion…"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                disabled={streaming} />
            ) : (
              <div className="space-y-2">
                {!pdfFile ? (
                  <button type="button" disabled={analyzing} onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary-400 rounded-xl p-4 text-center transition-colors group disabled:opacity-50">
                    <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-300 group-hover:text-primary-400 transition-colors" />
                    <p className="text-xs font-semibold text-slate-500 group-hover:text-primary-600">Click to upload PDF</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Text-based PDFs only · max 10 MB</p>
                  </button>
                ) : analyzing ? (
                  <div className="flex items-center gap-2.5 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800/30">
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Analysing PDF structure…</span>
                  </div>
                ) : pdfMeta ? (
                  <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10">
                    <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{pdfMeta.filename}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {pdfMeta.pageCount} pages
                        {pdfMeta.hasChapters && ' · chapters detected'}
                        {pdfMeta.hasLectures && ' · lecture structure detected'}
                      </p>
                    </div>
                    <button type="button" onClick={clearPdf} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}

                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileSelect} />

                {pdfMeta && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {NOTE_MODES.map(m => (
                      <button key={m.value} type="button" disabled={streaming} onClick={() => setMode(m.value)}
                        className={`flex items-start gap-2 px-2.5 py-2 rounded-xl border text-left transition-all text-xs ${
                          mode === m.value
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-primary-200 hover:bg-primary-50/40'
                        }`}>
                        <span className="text-sm leading-none mt-0.5 flex-shrink-0">{m.icon}</span>
                        <div>
                          <p className="font-semibold leading-tight">{m.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {pdfMeta && mode === 'page_range' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium flex-shrink-0">Pages</span>
                    <input type="number" min={1} max={pdfMeta.pageCount} value={pageFrom}
                      onChange={e => setPageFrom(Math.min(Math.max(1, Number(e.target.value)), pageTo))}
                      className="w-16 px-2 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
                    <span className="text-xs text-slate-400">to</span>
                    <input type="number" min={pageFrom} max={pdfMeta.pageCount} value={pageTo}
                      onChange={e => setPageTo(Math.min(Math.max(pageFrom, Number(e.target.value)), pdfMeta.pageCount))}
                      className="w-16 px-2 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
                    <span className="text-[10px] text-slate-400">of {pdfMeta.pageCount}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <select value={studyItemId} onChange={e => setStudyItemId(e.target.value)} disabled={streaming}
                  className="w-full appearance-none px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <option value="">Save to study item (optional)</option>
                  {studyItems.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <button type="submit" disabled={streaming || !canGenerate}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0">
                {streaming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
              </button>
            </div>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300">{error}</div>}

          {!notes && !streaming && !error && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">AI Notes Generator</p>
              <p className="text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                Enter a topic for instant notes, or upload a PDF for full, chapter-wise, page-range, or lecture-wise summaries.
              </p>
            </div>
          )}

          {(notes || streaming) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" /> Generated Notes
                </p>
                <div className="flex items-center gap-1.5">
                  {savedNoteId && selectedItem && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Saved to {selectedItem.title}
                    </span>
                  )}
                  {notes && !streaming && (
                    <>
                      <button onClick={() => navigator.clipboard.writeText(notes).then(() => toast.success('Copied!'))}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button onClick={handleDownload}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-5 text-slate-800 dark:text-slate-100">
                <Markdown text={notes} />
                {streaming && <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse rounded-sm ml-0.5" />}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ===================== Root Page =====================
export default function AiPage() {
  const [tab,      setTab]      = useState<Tab>('chat');
  const [language, setLanguage] = useState<Language>('english');

  useEffect(() => {
    const saved = localStorage.getItem(LS_LANG_KEY) as Language | null;
    if (saved && LANGS.some(l => l.value === saved)) setLanguage(saved);
  }, []);

  function switchLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem(LS_LANG_KEY, lang);
  }

  const TABS = [
    { id: 'chat'  as Tab, label: 'AI Chat',       icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'pdf'   as Tab, label: 'PDF + Ask AI',  icon: <FileText      className="w-4 h-4" /> },
    { id: 'notes' as Tab, label: 'Notes',          icon: <Sparkles      className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 112px)' }}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2 flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 p-1 gap-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Language selector */}
        {tab !== 'pdf' && (
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 p-1 gap-0.5">
            {LANGS.map(l => (
              <button key={l.value} onClick={() => switchLanguage(l.value)} dir={l.rtl ? 'rtl' : 'ltr'}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  language === l.value
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-hidden min-h-0">
        {tab === 'chat' && <ChatPanel language={language} />}

        {tab === 'pdf' && (
          <div className="h-full">
            <PdfAskAiPanel language={language} />
          </div>
        )}

        {tab === 'notes' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 h-full overflow-hidden">
            <NotesPanel language={language} />
          </div>
        )}
      </div>
    </div>
  );
}
