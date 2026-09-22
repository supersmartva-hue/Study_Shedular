import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { captureHandler, studyCaptureHandler, getCapturesHandler } from './ext.controller';

const router = Router();
router.use(authenticate);

router.post('/capture',       captureHandler);       // create task from page
router.post('/study-capture', studyCaptureHandler);  // create study item from page
router.get ('/',              getCapturesHandler);   // list captures

export default router;
