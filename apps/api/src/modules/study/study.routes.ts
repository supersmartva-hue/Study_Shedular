import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import {
  createStudyHandler, getStudyListHandler, getStudyHandler,
  updateStudyHandler, deleteStudyHandler,
  createNoteHandler, updateNoteHandler, deleteNoteHandler,
  addResourceHandler, deleteResourceHandler,
  getSyncSuggestionHandler, confirmSyncHandler,
} from './study.controller';

const router = Router();
router.use(authenticate);

router.get   ('/',                    getStudyListHandler);
router.post  ('/',                    createStudyHandler);
router.get   ('/:id',                 getStudyHandler);
router.patch ('/:id',                 updateStudyHandler);
router.delete('/:id',                 deleteStudyHandler);

router.post  ('/:id/notes',           createNoteHandler);
router.patch ('/:id/notes/:nid',      updateNoteHandler);
router.delete('/:id/notes/:nid',      deleteNoteHandler);

router.post  ('/:id/resources',       upload.single('file'), addResourceHandler);
router.delete('/:id/resources/:rid',  deleteResourceHandler);

router.get   ('/:id/sync-task',       getSyncSuggestionHandler);
router.post  ('/:id/confirm-sync',    confirmSyncHandler);

export default router;
