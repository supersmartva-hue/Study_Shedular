'use client';
import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Minimal SSE reader ────────────────────────────────────────────────────────
function parseSseLines(raw: string) {
  return raw.split('\n').filter(l => l.startsWith('data: ')).map(l => {
    try { return JSON.parse(l.slice(6)); } catch { return {}; }
  });
}

async function readSse(res: Response, onDelta: (d: string) => void): Promise<void> {
  if (!res.body) throw new Error('No response body');
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    for (const ev of parseSseLines(buf)) {
      if (ev.error) throw new Error(ev.error);
      if (ev.delta) onDelta(ev.delta);
    }
    buf = '';
  }
}

// ── Inline copy button ────────────────────────────────────────────────────────
function MiniCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="Copy"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="p-1 rounded hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
    >
      {copied
        ? <Check className="w-3 h-3 text-green-500" />
        : <Copy  className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderInline(s: string, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const k = `${key}-${m.index}`;
    if (m[2])      parts.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k} className="bg-black/10 px-1 rounded text-[10px] font-mono">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return <span key={key}>{parts}</span>;
}

function PanelMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];

  function flush() {
    if (!listBuf.length) return;
    blocks.push(
      <ul key={blocks.length} className="list-disc pl-4 my-1 space-y-0.5">
        {listBuf.map((t, j) => <li key={j} className="text-xs leading-relaxed">{renderInline(t, `li-${j}`)}</li>)}
      </ul>
    );
    listBuf = [];
  }

  for (const line of lines) {
    const h = line.match(/^#{1,3} (.+)/);
    if (h)  { flush(); blocks.push(<p key={blocks.length} className="text-xs font-bold mt-2 mb-0.5">{h[1]}</p>); continue; }
    const li = line.match(/^[-*+] (.+)/);
    if (li) { listBuf.push(li[1]); continue; }
    flush();
    if (!line.trim()) continue;
    blocks.push(<p key={blocks.length} className="text-xs leading-relaxed">{renderInline(line, `p-${blocks.length}`)}</p>);
  }
  flush();
  return <div className="space-y-1">{blocks}</div>;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Language = 'english' | 'urdu' | 'roman_urdu';
interface Msg  { role: 'user' | 'assistant'; content: string }

const QUICK_ACTIONS = [
  { label: 'Summarize',    prompt: 'Summarize the key points from this content.'  },
  { label: 'Explain',      prompt: 'Explain the main concepts in simple terms.'   },
  { label: 'Key points',   prompt: 'What are the most important takeaways?'       },
  { label: 'Quiz me',      prompt: 'Create 3 questions to test my understanding.' },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  context?:      string;    // text context for the AI to reason about
  contextLabel?: string;    // short description shown in the header
  language:      Language;
  placeholder?:  string;
  open:          boolean;
  onClose:       () => void;
  variant?:      'panel' | 'drawer'; // panel = flex inline, drawer = fixed right overlay
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ContextAiPanel({
  context, contextLabel, language, placeholder,
  open, onClose, variant = 'panel',
}: Props) {
  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [selText,   setSelText]   = useState('');
  const [selPos,    setSelPos]    = useState<{ x: number; y: number } | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
    else { setSelText(''); setSelPos(null); }
  }, [open]);

  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Global text-selection → "Explain this" floating tooltip
  useEffect(() => {
    function onMouseUp() {
      const sel  = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (text.length >= 15 && text.length <= 1500 && sel?.rangeCount) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setSelText(text);
        setSelPos({ x: rect.left + rect.width / 2, y: rect.top });
        return;
      }
      setSelText('');
      setSelPos(null);
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  function explainSelection() {
    const q = `Explain this: "${selText}"`;
    setSelText(''); setSelPos(null);
    window.getSelection()?.removeAllRanges();
    send(q);
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;
    setInput('');

    const newMsgs: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...newMsgs, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const token = localStorage.getItem('access_token');
      const base  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res   = await fetch(`${base}/api/ai/context-chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body:    JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          context,
          language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let acc = '';
      await readSse(res, d => {
        acc += d;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      });
    } catch (err: any) {
      toast.error(err.message || 'AI error');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  const wrapperCls = variant === 'drawer'
    ? `fixed inset-y-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-200 w-80 ${open ? 'translate-x-0' : 'translate-x-full'}`
    : `flex flex-col border-l border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 flex-shrink-0 w-72 ${open ? '' : 'hidden'}`;

  return (
    <>
      {/* "Explain this" tooltip — shown whenever text is selected, regardless of panel state */}
      {selPos && selText && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: selPos.x, top: selPos.y - 6, transform: 'translate(-50%, -100%)' }}
        >
          <button
            className="pointer-events-auto flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors whitespace-nowrap"
            onMouseDown={e => { e.preventDefault(); explainSelection(); }}
          >
            <Sparkles className="w-3 h-3" /> Explain this
          </button>
        </div>
      )}

      {/* Drawer backdrop (drawer mode only) */}
      {variant === 'drawer' && open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      )}

      <div className={wrapperCls}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">AI Assistant</p>
            {contextLabel && (
              <p className="text-[10px] text-slate-400 truncate" title={contextLabel}>{contextLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} title="Clear chat"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            <button onClick={onClose}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-5 h-5 text-primary-300 dark:text-primary-500" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ask me anything</p>
              <p className="text-[10px] text-slate-400 mt-1 px-4 leading-relaxed">
                {context
                  ? `I have context from "${contextLabel ?? 'this page'}" loaded. Select any text and click "Explain this" too!`
                  : 'Ask a question to get started.'}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-1.5 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary-600" />
                  </div>
                )}
                <div className={`max-w-[87%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                }`}>
                  {msg.content
                    ? (msg.role === 'assistant'
                        ? <PanelMarkdown text={msg.content} />
                        : <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>)
                    : (streaming && i === messages.length - 1
                        ? <span className="inline-block w-1.5 h-3 bg-slate-400 animate-pulse rounded-sm" />
                        : <span className="text-xs opacity-40">…</span>)
                  }
                </div>
                {msg.role === 'assistant' && msg.content && <MiniCopy text={msg.content} />}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick action chips — shown only on empty state */}
        {messages.length === 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} disabled={streaming}
                onClick={() => send(a.prompt)}
                className="text-[10px] px-2.5 py-1 bg-slate-50 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-slate-100 dark:border-white/10 hover:border-primary-200 text-slate-500 dark:text-slate-400 hover:text-primary-700 rounded-full transition-colors disabled:opacity-50">
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={placeholder ?? 'Ask about this content…'}
              disabled={streaming}
              className="input flex-1 text-xs py-2"
            />
            <button onClick={() => send()} disabled={streaming || !input.trim()}
              className="p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0">
              {streaming
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
