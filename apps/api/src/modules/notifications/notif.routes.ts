import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  getNotifications, markRead, markAllRead,
  savePushSubscription, removePushSubscription,
} from './notif.service';
import { env } from '../../config/env';

const router = Router();

// Public endpoint for VAPID key (no auth needed)
router.get('/vapid-key', (req, res) => {
  res.json({ success: true, vapidPublicKey: env.VAPID_PUBLIC_KEY || '' });
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const notifs = await getNotifications(req.user!.id);
    res.json({ success: true, data: notifs });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await markAllRead(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await markRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    await savePushSubscription(req.user!.id, subscription);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    await removePushSubscription(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
