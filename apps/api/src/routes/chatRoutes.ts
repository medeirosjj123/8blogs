import { Router } from 'express';
import {
  getChannels,
  createChannel,
  joinChannel,
  leaveChannel,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  getOrCreateDirectChannel,
  getAvailableUsers,
  getChannelMembers,
  updateChannel,
  deleteChannel,
  removeChannelMember,
  updateChannelMemberRole,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from '../controllers/chatController';
import { authenticate } from '../middlewares/authMiddleware';
import { messageRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Channel routes
router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.post('/channels/:channelId/join', joinChannel);
router.post('/channels/:channelId/leave', leaveChannel);
router.put('/channels/:channelId', updateChannel); // Update channel info
router.delete('/channels/:channelId', deleteChannel); // Delete channel

// Channel member management
router.get('/channels/:channelId/members', getChannelMembers); // Get channel members
router.delete('/channels/:channelId/members/:memberId', removeChannelMember); // Remove member
router.put('/channels/:channelId/members/:memberId', updateChannelMemberRole); // Update member role

// Message routes
router.get('/channels/:channelId/messages', getMessages);
router.get('/channels/:channelId/messages/search', searchMessages);
router.get('/channels/:channelId/pinned', getPinnedMessages); // Get pinned messages for a channel
router.post('/channels/:channelId/messages', messageRateLimiter, sendMessage); // Apply rate limiting to message sending
router.put('/messages/:messageId', messageRateLimiter, editMessage); // Apply rate limiting to message editing
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/pin', pinMessage); // Pin a message
router.delete('/messages/:messageId/pin', unpinMessage); // Unpin a message

// Direct Message routes
router.get('/users', getAvailableUsers); // Get all available users for DM
router.get('/direct/:targetUserId', getOrCreateDirectChannel); // Get or create DM channel

export default router;