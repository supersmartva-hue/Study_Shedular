import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes         from './modules/auth/auth.routes';
import tasksRoutes        from './modules/tasks/tasks.routes';
import studyRoutes        from './modules/study/study.routes';
import sessionsRoutes     from './modules/sessions/sessions.routes';
import statsRoutes        from './modules/stats/stats.routes';
import aiRoutes           from './modules/ai/ai.routes';
import searchRoutes       from './modules/search/search.routes';
import notifRoutes        from './modules/notifications/notif.routes';
import extensionRoutes    from './modules/extension/ext.routes';
import planningRoutes     from './modules/planning/planning.routes';

const app = express();

app.use(helmet());
const allowedOrigins = new Set([
	env.CLIENT_URL,
	...(env.NODE_ENV === 'development'
		? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']
		: []),
]);
app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.has(origin)) callback(null, true);
		else callback(new Error('Origin is not allowed by CORS'));
	},
	credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use('/api/auth',        authRoutes);
app.use('/api/tasks',       tasksRoutes);
app.use('/api/study',       studyRoutes);
app.use('/api/sessions',    sessionsRoutes);
app.use('/api/stats',       statsRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/search',      searchRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/extension',   extensionRoutes);
app.use('/api/planning',    planningRoutes);

app.use(errorHandler);

export default app;
