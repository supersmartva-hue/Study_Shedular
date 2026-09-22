import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getOrCreateStats, enrichStatsWithAchievements } from '../gamification/gamification.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const stats = await getOrCreateStats(req.user!.id);
    res.json({ success: true, data: enrichStatsWithAchievements(stats) });
  } catch (err) { next(err); }
});

export default router;
