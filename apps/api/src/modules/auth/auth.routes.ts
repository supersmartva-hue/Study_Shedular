import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  getMeHandler,
  updateMeHandler,
} from './auth.controller';

const router = Router();

router.post('/register', authLimiter, registerHandler);
router.post('/login',    authLimiter, loginHandler);
router.post('/refresh',  refreshHandler);
router.get ('/me',       authenticate, getMeHandler);
router.patch('/me',      authenticate, updateMeHandler);

export default router;
