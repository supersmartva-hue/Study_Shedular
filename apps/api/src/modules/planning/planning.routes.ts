import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { calculateSchedule } from '../../utils/priority';
import { createTaskForSession } from '../../utils/syncStudyTask';

const router = Router();
router.use(authenticate);

// GET /api/planning/schedule  — lightweight daily allocation (no sessions created)
router.get('/schedule', async (req, res, next) => {
  try {
    const items = await prisma.studyItem.findMany({
      where:  { userId: req.user!.id },
      select: { id: true, title: true, priorityPct: true, deadline: true },
    });
    const hours    = Number(req.query.hours) || 6;
    const schedule = calculateSchedule(items, hours);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// POST /api/planning/generate  — AI-powered weekly schedule → creates StudySession + Task records
router.post('/generate', async (req, res, next) => {
  try {
    const { weekStartDate } = z.object({
      weekStartDate: z.string().optional(),
    }).parse(req.body);

    const monday = weekStartDate ? new Date(weekStartDate) : getThisMonday();
    monday.setHours(0, 0, 0, 0);

    const items = await prisma.studyItem.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true, title: true, type: true, priorityPct: true,
        difficulty: true, estimatedHours: true, hoursCompleted: true,
        deadline: true, color: true,
      },
    });

    if (items.length === 0) {
      res.status(400).json({ success: false, message: 'Add at least one study item before generating a schedule.' });
      return;
    }

    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Remove study tasks for the week before wiping sessions (avoids orphaned tasks)
    await prisma.task.deleteMany({
      where: {
        userId:  req.user!.id,
        source:  { in: ['study', 'study_sync'] },
        dueDate: { gte: monday, lte: weekEnd },
      },
    });

    // Delete existing pending sessions for this week
    await prisma.studySession.deleteMany({
      where: {
        userId:      req.user!.id,
        status:      'pending',
        plannedDate: { gte: monday, lte: weekEnd },
      },
    });

    // Generate sessions — fall back to rule-based if Gemini fails or is absent
    let sessions: any[];
    if (env.GEMINI_API_KEY) {
      try {
        sessions = await generateWithGemini(req.user!.id, items, monday);
      } catch {
        sessions = generateFallback(req.user!.id, items, monday);
      }
    } else {
      sessions = generateFallback(req.user!.id, items, monday);
    }

    await prisma.studySession.createMany({ data: sessions });

    const created = await prisma.studySession.findMany({
      where: {
        userId:      req.user!.id,
        plannedDate: { gte: monday, lte: weekEnd },
      },
      include: { studyItem: { select: { title: true, color: true, type: true } } },
      orderBy: [{ plannedDate: 'asc' }, { startTime: 'asc' }],
    });

    // Sync ALL sessions to tasks — today's appear in the Today tab, future ones in Upcoming
    await Promise.all(created.map(s =>
      createTaskForSession(req.user!.id, {
        id:           s.id,
        title:        s.title,
        plannedDate:  new Date(s.plannedDate),
        startTime:    s.startTime,
        endTime:      s.endTime,
        durationMins: s.durationMins,
        studyItemId:  s.studyItemId,
      }),
    ));

    res.json({ success: true, data: { weekStart: monday.toISOString(), sessions: created } });
  } catch (err) { next(err); }
});

// ─── Gemini generation ────────────────────────────────────────────────────────
async function generateWithGemini(userId: string, items: any[], monday: Date) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const ai    = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const prompt = `You are a study schedule planner. Create a weekly study schedule.

STUDY ITEMS:
${JSON.stringify(items.map(it => ({
  id:             it.id,
  title:          it.title,
  type:           it.type,
  priority:       it.priorityPct,
  difficulty:     it.difficulty,
  hoursRemaining: Math.max(0, it.estimatedHours - it.hoursCompleted),
  deadline:       it.deadline ? new Date(it.deadline).toISOString().split('T')[0] : null,
})), null, 2)}

AVAILABLE DAYS: ${weekDays.join(', ')}
DAILY STUDY WINDOW: 09:00 – 21:00
SESSION DURATIONS: 25, 50, or 90 minutes only

RULES:
- Prioritize items with deadlines and higher difficulty
- Leave at least 10-minute gaps between sessions
- Don't schedule more than 4 hours per day total
- Each session must have a specific subject focus title

Return ONLY a JSON array like this:
[
  {
    "studyItemId": "uuid",
    "title":       "Topic focus",
    "plannedDate": "YYYY-MM-DD",
    "startTime":   "HH:MM",
    "endTime":     "HH:MM",
    "durationMins": 50,
    "notes":        "Optional tip"
  }
]`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Gemini returned invalid JSON — falling back to rule-based schedule');
  }

  // Validate each entry belongs to a real study item
  const validIds = new Set(items.map(i => i.id));

  return parsed
    .filter(s =>
      s.studyItemId && validIds.has(s.studyItemId) &&
      s.plannedDate && s.startTime && s.endTime && s.durationMins,
    )
    .map(s => ({
      userId,
      studyItemId:  s.studyItemId,
      title:        String(s.title).slice(0, 255),
      plannedDate:  new Date(s.plannedDate),
      startTime:    s.startTime,
      endTime:      s.endTime,
      durationMins: Number(s.durationMins),
      notes:        s.notes ? String(s.notes).slice(0, 1000) : null,
      status:       'pending',
    }));
}

// ─── Fallback (no AI key or Gemini failure) ───────────────────────────────────
function generateFallback(userId: string, items: any[], monday: Date) {
  const sessions: any[]  = [];
  const durations        = [50, 25, 90, 50, 25];
  const startTimes       = ['09:00', '10:30', '13:00', '14:30', '16:00', '18:00', '19:30'];
  const sorted           = [...items].sort((a, b) => b.priorityPct - a.priorityPct);

  sorted.forEach((item, idx) => {
    const remaining      = Math.max(0, item.estimatedHours - item.hoursCompleted);
    const sessionsNeeded = remaining > 0
      ? Math.min(3, Math.max(1, Math.ceil(remaining / 1.5)))
      : 1;

    for (let i = 0; i < sessionsNeeded; i++) {
      const dayOffset  = (idx * 2 + i) % 7;
      const planned    = new Date(monday); planned.setDate(planned.getDate() + dayOffset);
      const startTime  = startTimes[i % startTimes.length];
      const durMins    = durations[i % durations.length];
      const endTime    = addMinutes(startTime, durMins);

      sessions.push({
        userId,
        studyItemId:  item.id,
        title:        `${item.title} — Session ${i + 1}`,
        plannedDate:  planned,
        startTime,
        endTime,
        durationMins: durMins,
        status:       'pending',
      });
    }
  });

  return sessions;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getThisMonday(): Date {
  const d   = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export default router;
