import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './ai.service';
import { search as searchSvc } from '../search/search.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer, opts?: any) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

const langSchema = z.enum(['english', 'urdu', 'roman_urdu']).default('english');

export async function createChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { studyItemId, title } = req.body;
    const chat = await svc.createChat(req.user!.id, studyItemId, title);
    res.status(201).json({ success: true, data: chat });
  } catch (err) { next(err); }
}

export async function getChatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const chats = await svc.getChats(req.user!.id);
    res.json({ success: true, data: chats });
  } catch (err) { next(err); }
}

export async function getChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const chat = await svc.getChat(String(req.params.id), req.user!.id);
    res.json({ success: true, data: chat });
  } catch (err) { next(err); }
}

export async function deleteChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteChat(String(req.params.id), req.user!.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

export async function streamMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, language } = z.object({
      content:  z.string().min(1),
      language: langSchema,
    }).parse(req.body);

    await svc.streamMessage({
      chatId:   String(req.params.id),
      userId:   req.user!.id,
      content,
      language,
      res,
    });
  } catch (err) { next(err); }
}

export async function quickExplainHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, language, context } = z.object({
      content:  z.string().min(1),
      language: langSchema,
      context:  z.string().optional(),
    }).parse(req.body);

    const explanation = await svc.quickExplain(content, language, context);
    res.json({ success: true, data: { explanation } });
  } catch (err) { next(err); }
}

export async function queryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, language, context } = z.object({
      question: z.string().min(1),
      language: langSchema,
      context:  z.string().optional(),
    }).parse(req.body);

    const answer = await svc.quickExplain(question, language, context);
    res.json({ success: true, answer });
  } catch (err) { next(err); }
}

export async function generateNotesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { topic, studyItemId, language } = z.object({
      topic:       z.string().min(1).max(500),
      studyItemId: z.string().optional(),
      language:    langSchema,
    }).parse(req.body);

    await svc.streamNotes({ userId: req.user!.id, topic, studyItemId, language, res });
  } catch (err) { next(err); }
}

// ── PDF parse helper: returns full text + per-page text array ─────────────────
async function parsePdfWithPages(buffer: Buffer) {
  const pageTexts: string[] = [];
  const parsed = await pdfParse(buffer, {
    pagerender: (pageData: any) =>
      pageData.getTextContent().then((tc: any) => {
        const t = tc.items.map((i: any) => i.str).join(' ');
        pageTexts.push(t);
        return t;
      }),
  });
  return { parsed, pageTexts };
}

// ── Parse-only endpoint (metadata, no AI) ────────────────────────────────────
export async function parsePdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, error: 'No PDF file provided' }); return; }

    let parsed: { text: string; numpages: number };
    try {
      ({ parsed } = await parsePdfWithPages(file.buffer));
    } catch {
      res.status(400).json({ success: false, error: 'Could not parse PDF. Ensure it is a valid text-based PDF.' });
      return;
    }

    const fullText = parsed.text?.trim() ?? '';
    if (fullText.length < 50) {
      res.status(400).json({ success: false, error: 'No readable text found. The PDF may be scanned/image-based.' });
      return;
    }

    const chapterMatches = fullText.match(/^(?:Chapter|CHAPTER|Part|PART|Section|SECTION)\s+[\dIVXivx]+[\s:.][^\n]*/gm);
    const lectureMatches = fullText.match(/^(?:Lecture|LECTURE|Week|WEEK|Unit|UNIT)\s+\d+[\s:.][^\n]*/gm);

    res.json({
      success: true,
      data: {
        pageCount:        parsed.numpages,
        charCount:        fullText.length,
        filename:         file.originalname,
        hasChapters:      (chapterMatches?.length ?? 0) > 1,
        hasLectures:      (lectureMatches?.length ?? 0) > 1,
        detectedChapters: chapterMatches ? [...new Set(chapterMatches)].slice(0, 20).map(s => s.trim()) : [],
        detectedLectures: lectureMatches ? [...new Set(lectureMatches)].slice(0, 20).map(s => s.trim()) : [],
      },
    });
  } catch (err) { next(err); }
}

// ── Generate notes from PDF (SSE) ────────────────────────────────────────────
export async function generateNotesFromPdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, error: 'No PDF file provided' }); return; }

    let parsed: { text: string; numpages: number };
    let pageTexts: string[];
    try {
      ({ parsed, pageTexts } = await parsePdfWithPages(file.buffer));
    } catch {
      res.status(400).json({ success: false, error: 'Could not parse PDF. Ensure it is a valid text-based PDF.' });
      return;
    }

    const fullText = parsed.text?.trim() ?? '';
    if (fullText.length < 50) {
      res.status(400).json({ success: false, error: 'No readable text found. The PDF may be scanned/image-based.' });
      return;
    }

    const { studyItemId, language, mode, pageFrom, pageTo } = z.object({
      studyItemId: z.string().optional(),
      language:    langSchema,
      mode:        z.enum(['full', 'chapter', 'page_range', 'lecture']).default('full'),
      pageFrom:    z.coerce.number().int().min(1).optional(),
      pageTo:      z.coerce.number().int().min(1).optional(),
    }).parse(req.body);

    // For page_range: extract only the requested pages' text
    let pdfText = fullText;
    if (mode === 'page_range' && pageFrom && pageTo && pageTexts.length > 0) {
      const from = Math.max(0, pageFrom - 1);
      const to   = Math.min(pageTexts.length, pageTo);
      pdfText    = pageTexts.slice(from, to).join('\n\n');
    }

    await svc.streamNotesFromPdf({
      userId:     req.user!.id,
      pdfText,
      filename:   file.originalname,
      studyItemId,
      language,
      mode,
      pageFrom,
      pageTo,
      totalPages: parsed.numpages,
      res,
    });
  } catch (err) { next(err); }
}

export async function pdfTextHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, error: 'No PDF file provided' }); return; }

    let parsed: { text: string; numpages: number };
    try { parsed = await pdfParse(file.buffer); }
    catch {
      res.status(400).json({ success: false, error: 'Could not parse PDF. Ensure it is a valid text-based PDF.' });
      return;
    }

    const fullText = (parsed.text ?? '').trim();
    if (fullText.length < 50) {
      res.status(400).json({ success: false, error: 'No readable text found. The PDF may be scanned/image-based.' });
      return;
    }

    res.json({
      success: true,
      data: {
        text:      fullText.slice(0, 10_000),
        pageCount: parsed.numpages,
        filename:  file.originalname,
        truncated: fullText.length > 10_000,
        charCount: fullText.length,
      },
    });
  } catch (err) { next(err); }
}

export async function contextChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { messages, context, language } = z.object({
      messages: z.array(z.object({
        role:    z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })).min(1).max(30),
      context:  z.string().max(10_000).optional(),
      language: langSchema,
    }).parse(req.body);

    await svc.streamContextChat({ messages, context, language, res });
  } catch (err) { next(err); }
}

export async function searchExplainHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, language, category } = z.object({
      query:    z.string().min(1),
      language: langSchema,
      category: z.enum(['all', 'web', 'handouts', 'papers', 'books']).default('all'),
    }).parse(req.body);

    // 1. Search for relevant sources
    const searchResults = await searchSvc(req.user!.id, query, category);

    // Adapt books to a common shape so the client can render them uniformly
    const bookSources = searchResults.books.slice(0, 4).map(b => ({
      title:   b.title,
      url:     b.previewLink || b.pdfLink || '',
      snippet: [b.authors?.join(', '), b.description?.slice(0, 160)].filter(Boolean).join(' — '),
      type:    'book' as const,
    }));

    const allSources = [
      ...searchResults.web,
      ...searchResults.handouts,
      ...searchResults.papers,
      ...bookSources,
    ].slice(0, 8);

    // 2. Build context from search snippets
    const sourceContext = allSources.length > 0
      ? allSources.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n')
      : '';

    // 3. Stream AI explanation grounded in search results
    const systemAddition = sourceContext
      ? `\n\nSearch results to use as context (cite these when relevant):\n${sourceContext}`
      : '';

    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    // Send sources first so the client can render them immediately
    res.write(`data: ${JSON.stringify({ sources: allSources })}\n\n`);

    await svc.streamExplain({ query, language, systemAddition, res });
  } catch (err) { next(err); }
}
