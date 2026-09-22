'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Copy, Download, FileText, X, Loader2, Sparkles } from 'lucide-react';

interface Props {
  studyItemId: string;
  onNoteSaved: () => void;
}

export default function PdfNotesGenerator({ studyItemId, onNoteSaved }: Props) {
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const scrollRef                       = useRef<HTMLDivElement>(null);
  const [generating,    setGenerating]  = useState(false);
  const [streamText,    setStreamText]  = useState('');
  const [finalNotes,    setFinalNotes]  = useState('');
  const [filename,      setFilename]    = useState('');
  const [copied,        setCopied]      = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB');
      return;
    }

    setFilename(file.name);
    setGenerating(true);
    setStreamText('');
    setFinalNotes('');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('studyItemId', studyItemId);
    formData.append('language', 'english');

    const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token   = localStorage.getItem('access_token');

    try {
      const response = await fetch(`${baseURL}/api/ai/generate-notes-pdf`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body:    formData,
      });

      // Non-2xx before streaming starts = JSON error
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Server error ${response.status}`);
      }

      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let   accumulated = '';
      let   buf         = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';   // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));

            if (evt.delta) {
              accumulated += evt.delta;
              setStreamText(accumulated);
              // Auto-scroll preview
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }

            if (evt.error) throw new Error(evt.error);

            if (evt.done) {
              setFinalNotes(accumulated);
              setGenerating(false);
              if (evt.noteId) {
                toast.success('Notes generated and saved!');
                onNoteSaved();
              } else {
                toast.success('Notes generated!');
              }
            }
          } catch (parseErr: any) {
            if (parseErr?.message && !parseErr.message.startsWith('JSON')) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate notes');
      setGenerating(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleCopy() {
    if (!finalNotes) return;
    navigator.clipboard.writeText(finalNotes).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!finalNotes) return;
    const blob     = new Blob([finalNotes], { type: 'text/markdown;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const anchor   = document.createElement('a');
    anchor.href    = url;
    anchor.download = `notes-${filename.replace(/\.pdf$/i, '')}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setStreamText('');
    setFinalNotes('');
    setFilename('');
  }

  const hasOutput = generating || streamText;

  return (
    <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/60 to-violet-50/60 p-4 mb-4">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Generate Notes from PDF</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload a PDF — AI extracts and structures study notes</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {finalNotes && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/70 transition-colors"
              title="Clear">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors">
            {generating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Upload className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Upload PDF'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Filename badge */}
      {filename && (
        <div className="flex items-center gap-1.5 text-xs text-primary-700 bg-primary-100/70 px-2.5 py-1 rounded-full w-fit mb-3">
          <FileText className="w-3 h-3" />
          <span className="truncate max-w-[220px]">{filename}</span>
        </div>
      )}

      {/* Live stream + final output */}
      {hasOutput && (
        <div className="mt-1">

          {/* Streaming status */}
          {generating && (
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
              <span className="text-xs text-primary-600 font-medium">
                Analyzing PDF and generating notes…
              </span>
            </div>
          )}

          {/* Notes output */}
          <div
            ref={scrollRef}
            className="bg-white rounded-lg border border-slate-100 p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto"
            style={{ maxHeight: 320, minHeight: 80 }}>
            {streamText || ' '}
            {generating && (
              <span className="inline-block w-2 h-3.5 bg-primary-400 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>

          {/* Action buttons — shown when generation is complete */}
          {finalNotes && !generating && (
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download .md
              </button>
              <span className="text-xs text-slate-400 ml-auto">
                Saved to your notes below
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty-state hint */}
      {!hasOutput && !filename && (
        <p className="text-xs text-slate-400 text-center py-2">
          Supports text-based PDFs up to 10 MB
        </p>
      )}
    </div>
  );
}
