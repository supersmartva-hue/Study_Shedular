import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { search, getSearchHistory, getSearchEngine } from './search.service';

const router = Router();

// Public status endpoint — tells frontend which search engine is active
router.get('/status', (_req, res) => {
  const engine = getSearchEngine();
  res.json({ configured: engine !== 'none', engine });
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const q    = (req.query.q as string) ?? '';
    const type = (req.query.type as any) ?? 'all';
    if (!q.trim()) { res.status(400).json({ success: false, message: 'Query required' }); return; }
    const results = await search(req.user!.id, q, type);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
  try {
    const history = await getSearchHistory(req.user!.id);
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});

export default router;
