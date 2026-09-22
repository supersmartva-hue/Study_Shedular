import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  getSessionsHandler, getSessionHandler, createSessionHandler,
  completeSessionHandler, skipSessionHandler, deleteSessionHandler,
  getWeekHandler,
} from './sessions.controller';

const router = Router();
router.use(authenticate);

router.get ('/',             getSessionsHandler);
router.post('/',             createSessionHandler);
router.get ('/week',         getWeekHandler);
router.get ('/:id',          getSessionHandler);
router.post('/:id/complete', completeSessionHandler);
router.post('/:id/skip',     skipSessionHandler);
router.delete('/:id',        deleteSessionHandler);

export default router;
