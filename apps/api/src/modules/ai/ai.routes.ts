import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import {
  createChatHandler, getChatsHandler, getChatHandler,
  deleteChatHandler, streamMessageHandler, quickExplainHandler,
  searchExplainHandler, queryHandler, generateNotesHandler,
  generateNotesFromPdfHandler, parsePdfHandler, contextChatHandler,
  pdfTextHandler,
} from './ai.controller';

const router = Router();
router.use(authenticate);

const pdfUpload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

router.get   ('/chats',                   getChatsHandler);
router.post  ('/chats',                   createChatHandler);
router.get   ('/chats/:id',               getChatHandler);
router.delete('/chats/:id',               deleteChatHandler);
router.post  ('/chats/:id/message',       aiLimiter, streamMessageHandler);
router.post  ('/query',                   aiLimiter, queryHandler);
router.post  ('/explain',                 aiLimiter, quickExplainHandler);
router.post  ('/search-explain',          aiLimiter, searchExplainHandler);
router.post  ('/generate-notes',          aiLimiter, generateNotesHandler);
router.post  ('/parse-pdf',                         pdfUpload.single('pdf'), parsePdfHandler);
router.post  ('/generate-notes-pdf',      aiLimiter, pdfUpload.single('pdf'), generateNotesFromPdfHandler);
router.post  ('/context-chat',            aiLimiter, contextChatHandler);
router.post  ('/pdf-text',                          pdfUpload.single('pdf'), pdfTextHandler);

export default router;
