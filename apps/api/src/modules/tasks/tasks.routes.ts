import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  createTaskHandler,
  getTasksHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  completeTaskHandler,
  getCalendarHandler,
  syncLocalTasksHandler,
} from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get   ('/',              getTasksHandler);
router.post  ('/',              createTaskHandler);
router.post  ('/sync-local',    syncLocalTasksHandler);
router.get   ('/calendar',      getCalendarHandler);
router.get   ('/:id',           getTaskHandler);
router.patch ('/:id',           updateTaskHandler);
router.delete('/:id',           deleteTaskHandler);
router.post  ('/:id/complete',  completeTaskHandler);

export default router;
