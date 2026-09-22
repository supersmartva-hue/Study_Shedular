import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import type { Response } from 'express';

type Language = 'english' | 'urdu' | 'roman_urdu';

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_MODEL       = 'gemini-2.0-flash';
const GROQ_MODEL         = 'llama-3.1-8b-instant';   // fast free Groq model
const POLLINATIONS_URL   = 'https://text.pollinations.ai/';
const POLLINATIONS_MODEL = 'openai';   // free GPT-class model, no key needed

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const SYSTEM_PROMPTS: Record<Language, string> = {
  english:    `You are a smart study assistant. Explain concepts clearly using simple language and helpful examples. Be concise and structured. Use bullet points where they help.`,
  urdu:       `آپ ایک ذہین تعلیمی معاون ہیں۔ تصورات کو واضح اور سادہ اردو میں سمجھائیں۔ مثالیں دیں اور منظم انداز میں جواب دیں۔`,
  roman_urdu: `Aap ek smart study assistant hain. Concepts ko simple Roman Urdu mein samjhayein. Examples dijiye aur structured jawab dein. Bullet points use karein jab zaroorat ho.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function smartTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= 60) return t;
  const cut = t.lastIndexOf(' ', 57);
  return (cut > 20 ? t.slice(0, cut) : t.slice(0, 57)) + '…';
}

function sseError(res: Response, message: string) {
  res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

function startSse(res: Response) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
}

function buildGeminiHistory(msgs: { role: string; content: string }[]) {
  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of msgs) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (history.length > 0 && history[history.length - 1].role === role) {
      history[history.length - 1].parts[0].text += '\n' + m.content;
    } else {
      history.push({ role, parts: [{ text: m.content }] });
    }
  }
  return history;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Priority: Gemini (if key) → Groq (if key, fast & free) → Pollinations (no key)
function useGemini(): boolean { return !!env.GEMINI_API_KEY; }
function useGroq():   boolean { return !env.GEMINI_API_KEY && !!env.GROQ_API_KEY; }

function groqClient(): OpenAI {
  return new OpenAI({
    apiKey:  env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// ─── Pollinations (free, no API key required) ─────────────────────────────────
interface OAMessage { role: 'system' | 'user' | 'assistant'; content: string }

async function pollinationsStream(messages: OAMessage[], res: Response): Promise<string> {
  const response = await fetch(POLLINATIONS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, model: POLLINATIONS_MODEL, stream: true }),
    signal:  AbortSignal.timeout(60_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Pollinations error: ${response.status}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = '';
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';   // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const raw = trimmed.slice(5).trim();
      if (raw === '[DONE]') continue;
      try {
        const json  = JSON.parse(raw);
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          fullText += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      } catch { /* skip malformed */ }
    }
  }

  return fullText;
}

async function pollinationsOnce(messages: OAMessage[]): Promise<string> {
  const response = await fetch(POLLINATIONS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, model: POLLINATIONS_MODEL, stream: false }),
    signal:  AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`Pollinations error: ${response.status}`);
  return response.text();
}

// ─── Groq (free, fast, OpenAI-compatible) ────────────────────────────────────
async function groqStream(messages: OAMessage[], res: Response): Promise<string> {
  const client = groqClient();
  const stream = await client.chat.completions.create({
    model:    GROQ_MODEL,
    messages,
    stream:   true,
    max_tokens: 2048,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullText += delta;
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
  }
  return fullText;
}

async function groqOnce(messages: OAMessage[]): Promise<string> {
  const client = groqClient();
  const result = await client.chat.completions.create({
    model:    GROQ_MODEL,
    messages,
    stream:   false,
    max_tokens: 2048,
  });
  return result.choices[0]?.message?.content ?? '';
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function createChat(userId: string, studyItemId?: string, title?: string) {
  return prisma.aiChat.create({ data: { userId, studyItemId, messages: [], title } });
}

export async function getChats(userId: string) {
  return prisma.aiChat.findMany({
    where:   { userId },
    orderBy: { updatedAt: 'desc' },
    select:  { id: true, title: true, studyItemId: true, createdAt: true, updatedAt: true },
  });
}

export async function getChat(id: string, userId: string) {
  const chat = await prisma.aiChat.findFirst({ where: { id, userId } });
  if (!chat) { const e = new Error('Chat not found') as any; e.status = 404; throw e; }
  return chat;
}

export async function deleteChat(id: string, userId: string) {
  await getChat(id, userId);
  return prisma.aiChat.delete({ where: { id } });
}

// ─── Stream message ───────────────────────────────────────────────────────────
interface StreamMessageInput {
  chatId:   string;
  userId:   string;
  content:  string;
  language: Language;
  res:      Response;
}

export async function streamMessage({ chatId, userId, content, language, res }: StreamMessageInput) {
  startSse(res);

  try {
    const chat    = await getChat(chatId, userId);
    const history = chat.messages as { role: string; content: string }[];

    // Inject linked study notes as context
    let contextNote = '';
    if (chat.studyItemId) {
      const notes = await prisma.note.findMany({
        where: { studyItemId: chat.studyItemId }, take: 3, orderBy: { updatedAt: 'desc' },
      });
      if (notes.length > 0)
        contextNote = `\n\nUser's notes on this topic:\n${notes.map(n => n.content).join('\n---\n')}`;
    }

    const systemPrompt = SYSTEM_PROMPTS[language] + contextNote;
    const prevTurns    = history.slice(-14);
    const updatedHistory = [...history, { role: 'user', content, ts: new Date().toISOString() }];

    let fullResponse = '';

    const oaMsgs: OAMessage[] = [
      { role: 'system', content: systemPrompt },
      ...prevTurns.map(m => ({
        role:    (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content },
    ];

    if (useGemini()) {
      const gemini  = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model   = gemini.getGenerativeModel({
        model: GEMINI_MODEL, systemInstruction: systemPrompt, safetySettings: SAFETY,
      });
      const session = model.startChat({ history: buildGeminiHistory(prevTurns) });
      const result  = await session.sendMessageStream(content);
      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (delta) { fullResponse += delta; res.write(`data: ${JSON.stringify({ delta })}\n\n`); }
      }
    } else if (useGroq()) {
      fullResponse = await groqStream(oaMsgs, res);
    } else {
      fullResponse = await pollinationsStream(oaMsgs, res);
    }

    updatedHistory.push({ role: 'assistant', content: fullResponse, ts: new Date().toISOString() });
    const finalTitle = chat.title || smartTitle(content);
    await prisma.aiChat.update({
      where: { id: chatId },
      data:  { messages: updatedHistory, title: finalTitle, updatedAt: new Date() },
    });

    res.write(`data: ${JSON.stringify({ done: true, chatTitle: finalTitle })}\n\n`);
    res.end();
  } catch (err: any) {
    const msg = String(err?.message ?? 'AI request failed');
    sseError(res, msg.includes('quota') ? 'Rate limit hit — wait a moment and try again.' : msg);
  }
}

// ─── Quick explain (non-streaming) ───────────────────────────────────────────
export async function quickExplain(content: string, language: Language, context?: string): Promise<string> {
  const system = SYSTEM_PROMPTS[language] + (context ? `\n\nContext:\n${context}` : '');

  const msgs: OAMessage[] = [{ role: 'system', content: system }, { role: 'user', content }];
  try {
    if (useGemini()) {
      const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model  = gemini.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: system, safetySettings: SAFETY });
      return (await model.generateContent(content)).response.text();
    }
    if (useGroq()) return await groqOnce(msgs);
    return await pollinationsOnce(msgs);
  } catch (err: any) {
    return `AI error: ${err?.message ?? 'unknown'}`;
  }
}

// ─── Notes generation (streaming) ────────────────────────────────────────────
interface StreamNotesInput {
  userId:       string;
  topic:        string;
  studyItemId?: string;
  language:     Language;
  res:          Response;
}

export async function streamNotes({ userId, topic, studyItemId, language, res }: StreamNotesInput) {
  startSse(res);
  try {
    const system = SYSTEM_PROMPTS[language];
    const prompt = `Generate comprehensive, well-structured study notes on: "${topic}"

Use this structure:
# [Topic Title]

## Key Concepts
- Define each important term or idea

## Core Content
Detailed explanation with examples and sub-sections

## Key Points to Remember
- Concise bullet points of must-know facts

## Examples & Applications
Practical examples or real-world use

## Quick Summary
2–3 sentence wrap-up of the most important takeaways

Use markdown formatting. Be thorough yet scannable.`;

    let fullText = '';

    const notesMsgs: OAMessage[] = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
    if (useGemini()) {
      const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model  = gemini.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: system, safetySettings: SAFETY });
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (delta) { fullText += delta; res.write(`data: ${JSON.stringify({ delta })}\n\n`); }
      }
    } else if (useGroq()) {
      fullText = await groqStream(notesMsgs, res);
    } else {
      fullText = await pollinationsStream(notesMsgs, res);
    }

    let noteId: string | undefined;
    if (studyItemId && fullText) {
      const item = await prisma.studyItem.findFirst({ where: { id: studyItemId, userId } });
      if (item) {
        const note = await prisma.note.create({
          data: {
            userId, studyItemId,
            title:   `AI Notes: ${topic.slice(0, 80)}`,
            content: fullText.slice(0, 10000),
          },
        });
        noteId = note.id;
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, noteId })}\n\n`);
    res.end();
  } catch (err: any) {
    sseError(res, String(err?.message ?? 'Failed to generate notes'));
  }
}

// ─── Search-grounded streaming explain ───────────────────────────────────────
interface StreamExplainInput {
  query:          string;
  language:       Language;
  systemAddition: string;
  res:            Response;
}

export async function streamExplain({ query, language, systemAddition, res }: StreamExplainInput) {
  try {
    const system = SYSTEM_PROMPTS[language] + systemAddition;
    const prompt = `Explain the following topic clearly and thoroughly. Reference the search results where relevant:\n\n${query}`;

    const explainMsgs: OAMessage[] = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
    if (useGemini()) {
      const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model  = gemini.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: system, safetySettings: SAFETY });
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    } else if (useGroq()) {
      await groqStream(explainMsgs, res);
    } else {
      await pollinationsStream(explainMsgs, res);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    sseError(res, String(err?.message ?? 'AI request failed'));
  }
}

// ─── Context-aware chat (stateless, no DB) ───────────────────────────────────
export async function streamContextChat({
  messages, context, language, res,
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  context?: string;
  language: Language;
  res:      Response;
}) {
  startSse(res);
  try {
    const ctxBlock = context
      ? `\n\nContext (content the user is currently reading or studying):\n${context.slice(0, 8000)}\n\nAnswer questions based on this context when relevant. If it doesn't cover the question, answer from general knowledge.`
      : '';
    const systemPrompt = SYSTEM_PROMPTS[language] + ctxBlock;

    const history = messages.slice(0, -1);
    const content = messages[messages.length - 1]?.content ?? '';

    const ctxMsgs: OAMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role:    (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content },
    ];

    if (useGemini()) {
      const gemini  = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model   = gemini.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: systemPrompt, safetySettings: SAFETY });
      const session = model.startChat({ history: buildGeminiHistory(history) });
      const result  = await session.sendMessageStream(content);
      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    } else if (useGroq()) {
      await groqStream(ctxMsgs, res);
    } else {
      await pollinationsStream(ctxMsgs, res);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    sseError(res, String(err?.message ?? 'AI request failed'));
  }
}

// ─── PDF Notes generation (streaming) ────────────────────────────────────────
type NoteMode = 'full' | 'chapter' | 'page_range' | 'lecture';

interface StreamPdfNotesInput {
  userId:       string;
  pdfText:      string;
  filename:     string;
  studyItemId?: string;
  language:     Language;
  mode:         NoteMode;
  pageFrom?:    number;
  pageTo?:      number;
  totalPages?:  number;
  res:          Response;
}

function buildPdfPrompt(docTitle: string, text: string, mode: NoteMode, pageFrom?: number, pageTo?: number): string {
  const body = `Document: "${docTitle}"\n\n---\n${text.slice(0, 50_000)}\n---\n\n`;

  if (mode === 'chapter') return `${body}This document contains chapters or sections. Create SEPARATE, structured study notes for each chapter or major section found in the text.

For each chapter or section use exactly this format:
## [Chapter/Section Title]
### Key Concepts
- List the main concepts introduced
### Main Points
Detailed explanation of the chapter's content
### Chapter Summary
1–2 sentence wrap-up

Cover ALL chapters/sections found. Use markdown formatting.`;

  if (mode === 'lecture') return `${body}This document contains lecture notes or is organised by lectures, weeks, or units. Create structured study notes for EACH lecture or unit found.

For each lecture or unit use exactly this format:
## [Lecture/Week/Unit Title]
### Learning Objectives
- List objectives if mentioned, otherwise state the main goals
### Key Concepts
- Terms, definitions, and important ideas
### Main Content
Thorough coverage of what was taught
### Lecture Summary
1–2 sentence wrap-up

Cover ALL lectures/units found. Use markdown formatting.`;

  if (mode === 'page_range') return `${body}These are the extracted contents of pages ${pageFrom}–${pageTo}. Generate comprehensive, well-structured study notes from this specific section.

# ${docTitle} — Pages ${pageFrom}–${pageTo}

## Overview
What this page range covers (2–3 sentences).

## Key Concepts
Important terms and ideas introduced in this section.

## Main Content
Detailed coverage of the topics, with sub-sections where appropriate.

## Key Points to Remember
- Concise bullet points of the must-know facts from these pages.

## Quick Summary
2–3 sentence wrap-up of the most important takeaways from this section.

Use markdown formatting. Be thorough yet scannable.`;

  // default: 'full'
  return `${body}Generate comprehensive, well-structured study notes from this entire document.

# ${docTitle} — Study Notes

## Overview
2–3 sentence summary of what this document covers.

## Key Concepts
Important terms, definitions, and ideas from the document.

## Main Content
Detailed coverage of the document's primary topics, organised clearly with sub-sections.

## Key Points to Remember
- Concise bullet points of the most important facts and takeaways.

## Important Data & Quotes
Notable statistics, quotes, or data points found in the document (skip if none).

## Quick Summary
3–4 sentence wrap-up of the most important takeaways.

Use markdown formatting. Be thorough yet scannable.`;
}

export async function streamNotesFromPdf({
  userId, pdfText, filename, studyItemId, language, mode, pageFrom, pageTo, res,
}: StreamPdfNotesInput) {
  startSse(res);
  try {
    const system   = SYSTEM_PROMPTS[language];
    const docTitle = filename.replace(/\.pdf$/i, '');
    const prompt   = buildPdfPrompt(docTitle, pdfText, mode, pageFrom, pageTo);

    let fullText = '';

    const pdfMsgs: OAMessage[] = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
    if (useGemini()) {
      const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
      const model  = gemini.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: system, safetySettings: SAFETY });
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (delta) { fullText += delta; res.write(`data: ${JSON.stringify({ delta })}\n\n`); }
      }
    } else if (useGroq()) {
      fullText = await groqStream(pdfMsgs, res);
    } else {
      fullText = await pollinationsStream(pdfMsgs, res);
    }

    let noteId: string | undefined;
    if (studyItemId && fullText) {
      const item = await prisma.studyItem.findFirst({ where: { id: studyItemId, userId } });
      if (item) {
        const note = await prisma.note.create({
          data: {
            userId,
            studyItemId,
            title:   mode === 'page_range'
              ? `PDF Notes (pp.${pageFrom}–${pageTo}): ${docTitle.slice(0, 60)}`
              : mode === 'chapter'  ? `Chapter Notes: ${docTitle.slice(0, 70)}`
              : mode === 'lecture'  ? `Lecture Notes: ${docTitle.slice(0, 70)}`
              : `PDF Notes: ${docTitle.slice(0, 80)}`,
            content: fullText.slice(0, 10_000),
          },
        });
        noteId = note.id;
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, noteId })}\n\n`);
    res.end();
  } catch (err: any) {
    sseError(res, String(err?.message ?? 'Failed to generate notes from PDF'));
  }
}
