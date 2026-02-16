import express from 'express';
import {
  startConversation,
  sendMessage,
  getMessages,
  getConversations,
  closeConversation,
  getStats,
  markAsReadAdmin
} from '../controllers/supportChat-controller.js';
import { authMiddleware } from '../middleware/auth-middleware.js';

const router = express.Router();

// Stats (admin/manager check is done in controller)
router.get('/stats', authMiddleware, getStats);

// Conversation routes
router.post('/conversation/start', authMiddleware, startConversation);
router.get('/conversations', authMiddleware, getConversations);
router.patch('/conversation/:conversationId/close', authMiddleware, closeConversation);
router.patch('/conversation/:conversationId/mark-read-admin', authMiddleware, markAsReadAdmin);

// Message routes
router.post('/message/send', authMiddleware, sendMessage);
router.get('/conversation/:conversationId/messages', authMiddleware, getMessages);

export default router;