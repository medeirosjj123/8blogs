/**
 * Chat API Integration Tests
 * Tests for messaging, channels, and real-time features
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  resetTestDB
} from '../../helpers/setup';
import { 
  createMessage, 
  createChannel,
  createUser 
} from '../../helpers/factories';
import { 
  createAndLoginUser,
  loginAsStudent,
  loginAsAdmin
} from '../../helpers/auth-helper';

// Import your Express app
import app from '../../../apps/api/src/app';

describe('Chat API', () => {
  let studentToken: string;
  let adminToken: string;
  let studentId: string;
  let adminId: string;

  beforeAll(async () => {
    await setupIntegrationTest();
    
    // Login users for tests
    const student = await loginAsStudent(app);
    studentToken = student.token;
    studentId = student.user.id;

    const admin = await loginAsAdmin(app);
    adminToken = admin.token;
    adminId = admin.user.id;
  });

  afterAll(async () => {
    await cleanupIntegrationTest();
  });

  beforeEach(async () => {
    // Keep users but clear messages and channels
    // You might need to adjust this based on your schema
  });

  describe('GET /api/v1/channels', () => {
    it('should list all public channels', async () => {
      const response = await request(app)
        .get('/api/v1/channels')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('channels');
      expect(Array.isArray(response.body.channels)).toBe(true);
      
      // Should have at least the default channels
      expect(response.body.channels.length).toBeGreaterThan(0);
      
      // Check channel structure
      if (response.body.channels.length > 0) {
        const channel = response.body.channels[0];
        expect(channel).toHaveProperty('name');
        expect(channel).toHaveProperty('description');
        expect(channel).toHaveProperty('isPublic');
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/channels')
        .expect(401);
    });
  });

  describe('POST /api/v1/channels', () => {
    it('should create a new channel (admin only)', async () => {
      const channelData = createChannel();

      const response = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(channelData)
        .expect(201);

      expect(response.body).toHaveProperty('channel');
      expect(response.body.channel.name).toBe(channelData.name);
      expect(response.body.channel.description).toBe(channelData.description);
    });

    it('should reject channel creation from non-admin', async () => {
      const channelData = createChannel();

      await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(channelData)
        .expect(403);
    });

    it('should reject duplicate channel names', async () => {
      const channelData = createChannel({ name: 'unique-channel' });

      // Create first channel
      await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(channelData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(channelData)
        .expect(400);
    });
  });

  describe('POST /api/v1/messages', () => {
    let channelId: string;

    beforeEach(async () => {
      // Create a channel for testing
      const response = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ name: `test-channel-${Date.now()}` }));
      
      channelId = response.body.channel._id || response.body.channel.id;
    });

    it('should send a message to a channel', async () => {
      const messageData = createMessage({ channelId });

      const response = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message.content).toBe(messageData.content);
      expect(response.body.message.channelId).toBe(channelId);
      expect(response.body.message).toHaveProperty('userId');
      expect(response.body.message).toHaveProperty('timestamp');
    });

    it('should reject empty messages', async () => {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ channelId, content: '' })
        .expect(400);
    });

    it('should reject messages to non-existent channels', async () => {
      const messageData = createMessage({ 
        channelId: '507f1f77bcf86cd799439011' // Valid ObjectId format but doesn't exist
      });

      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(messageData)
        .expect(404);
    });

    it('should support message with mentions', async () => {
      const messageData = createMessage({ 
        channelId,
        content: `Hello @${adminId}, how are you?`
      });

      const response = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.message.content).toContain(`@${adminId}`);
      
      // Check if mentions are parsed (if implemented)
      if (response.body.message.mentions) {
        expect(response.body.message.mentions).toContain(adminId);
      }
    });
  });

  describe('GET /api/v1/messages/:channelId', () => {
    let channelId: string;
    let messageIds: string[] = [];

    beforeEach(async () => {
      // Create a channel
      const channelResponse = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ name: `test-channel-${Date.now()}` }));
      
      channelId = channelResponse.body.channel._id || channelResponse.body.channel.id;

      // Create some messages
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/messages')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(createMessage({ 
            channelId,
            content: `Test message ${i}`
          }));
        
        messageIds.push(response.body.message._id || response.body.message.id);
      }
    });

    it('should retrieve messages from a channel', async () => {
      const response = await request(app)
        .get(`/api/v1/messages/${channelId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBe(5);
      
      // Check messages are in correct order (usually newest first or oldest first)
      const firstMessage = response.body.messages[0];
      expect(firstMessage).toHaveProperty('content');
      expect(firstMessage).toHaveProperty('userId');
      expect(firstMessage).toHaveProperty('timestamp');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/messages/${channelId}?limit=2&offset=0`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(2);
      
      // Check for pagination metadata if implemented
      if (response.body.pagination) {
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('offset');
      }
    });

    it('should reject access to private channels for non-members', async () => {
      // Create a private channel
      const privateChannelResponse = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ 
          name: `private-${Date.now()}`,
          isPublic: false
        }));
      
      const privateChannelId = privateChannelResponse.body.channel._id;

      // Try to access as non-member
      await request(app)
        .get(`/api/v1/messages/${privateChannelId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/messages/:messageId', () => {
    let messageId: string;
    let channelId: string;

    beforeEach(async () => {
      // Create a channel
      const channelResponse = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ name: `test-channel-${Date.now()}` }));
      
      channelId = channelResponse.body.channel._id;

      // Create a message
      const messageResponse = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createMessage({ channelId }));
      
      messageId = messageResponse.body.message._id;
    });

    it('should allow user to edit their own message', async () => {
      const updatedContent = 'This message has been edited';

      const response = await request(app)
        .put(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: updatedContent })
        .expect(200);

      expect(response.body.message.content).toBe(updatedContent);
      expect(response.body.message.edited).toBe(true);
      expect(response.body.message).toHaveProperty('editedAt');
    });

    it('should not allow editing other users messages', async () => {
      await request(app)
        .put(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Trying to edit someone else message' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/messages/:messageId', () => {
    let messageId: string;
    let channelId: string;

    beforeEach(async () => {
      // Create a channel
      const channelResponse = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ name: `test-channel-${Date.now()}` }));
      
      channelId = channelResponse.body.channel._id;

      // Create a message
      const messageResponse = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createMessage({ channelId }));
      
      messageId = messageResponse.body.message._id;
    });

    it('should allow user to delete their own message', async () => {
      await request(app)
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Verify message is deleted
      const response = await request(app)
        .get(`/api/v1/messages/${channelId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const deletedMessage = response.body.messages.find(
        (m: any) => m._id === messageId
      );
      
      // Message should either be gone or marked as deleted
      expect(deletedMessage).toBeUndefined();
    });

    it('should allow admin to delete any message', async () => {
      await request(app)
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('POST /api/v1/messages/:messageId/pin', () => {
    let messageId: string;
    let channelId: string;

    beforeEach(async () => {
      // Create a channel
      const channelResponse = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createChannel({ name: `test-channel-${Date.now()}` }));
      
      channelId = channelResponse.body.channel._id;

      // Create a message
      const messageResponse = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createMessage({ channelId }));
      
      messageId = messageResponse.body.message._id;
    });

    it('should pin a message (admin/moderator only)', async () => {
      const response = await request(app)
        .post(`/api/v1/messages/${messageId}/pin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message.pinned).toBe(true);
    });

    it('should not allow regular users to pin messages', async () => {
      await request(app)
        .post(`/api/v1/messages/${messageId}/pin`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('Direct Messages', () => {
    it('should send a direct message to another user', async () => {
      const response = await request(app)
        .post('/api/v1/messages/direct')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: adminId,
          content: 'Hello, this is a direct message!'
        })
        .expect(201);

      expect(response.body.message.isDirect).toBe(true);
      expect(response.body.message.content).toBe('Hello, this is a direct message!');
    });

    it('should retrieve direct message history', async () => {
      // Send a few DMs first
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/messages/direct')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            recipientId: adminId,
            content: `DM ${i}`
          });
      }

      // Get DM history
      const response = await request(app)
        .get(`/api/v1/messages/direct/${adminId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(3);
      expect(response.body.messages[0]).toHaveProperty('content');
    });
  });
});