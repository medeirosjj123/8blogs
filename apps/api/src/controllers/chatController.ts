import { Response } from 'express';
import { Channel } from '../models/Channel';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import mongoose from 'mongoose';
import pino from 'pino';
import notificationService from '../services/notificationService';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Helper function to extract mentions from message content
function extractMentions(content: string): string[] {
  // Match @username patterns
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].toLowerCase()); // Store usernames in lowercase for matching
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

// Helper function to find users by username mentions
async function findMentionedUsers(mentions: string[], channelId: string): Promise<any[]> {
  if (mentions.length === 0) return [];
  
  try {
    // Get channel members to limit mention search scope
    const channel = await Channel.findById(channelId).populate('members.userId', 'name email _id');
    if (!channel) return [];
    
    const channelMemberIds = channel.members.map(m => (m.userId as any)._id);
    
    // Find users by name (case insensitive) that are members of the channel
    const users = await User.find({
      _id: { $in: channelMemberIds },
      name: { 
        $in: mentions.map(mention => new RegExp(`^${mention}$`, 'i')) 
      }
    }).select('_id name email');
    
    return users;
  } catch (error) {
    logger.error({ error }, 'Error finding mentioned users');
    return [];
  }
}

// Get all channels user has access to
export async function getChannels(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get public channels and channels where user is a member
    const channels = await Channel.find({
      $or: [
        { type: 'public', isArchived: false },
        { 'members.userId': userId, isArchived: false }
      ]
    })
    .populate('members.userId', 'name email')
    .sort({ lastMessageAt: -1 });
    
    res.json({
      channels: channels.map(channel => {
        let displayName = channel.name;
        let otherUser = null;
        
        // For direct messages, show the other user's name
        if (channel.type === 'direct') {
          const otherMember = channel.members.find(
            m => m.userId._id.toString() !== userId
          );
          if (otherMember && otherMember.userId) {
            displayName = (otherMember.userId as any).name;
            otherUser = {
              id: (otherMember.userId as any)._id,
              name: (otherMember.userId as any).name,
              email: (otherMember.userId as any).email
            };
          }
        }
        
        return {
          id: channel._id,
          name: displayName,
          slug: channel.slug,
          description: channel.description,
          type: channel.type,
          category: channel.category,
          memberCount: channel.memberCount,
          lastMessageAt: channel.lastMessageAt,
          lastMessagePreview: channel.lastMessagePreview,
          isMember: channel.isMember(new mongoose.Types.ObjectId(userId)),
          userRole: channel.getMemberRole(new mongoose.Types.ObjectId(userId)),
          otherUser // Include other user info for DMs
        };
      })
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching channels');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch channels'
    });
  }
}

// Create a new channel
export async function createChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { name, description, type = 'public', category = 'general' } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!name) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Channel name is required'
      });
      return;
    }
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if slug already exists
    const existingChannel = await Channel.findOne({ slug });
    if (existingChannel) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Channel with this name already exists'
      });
      return;
    }
    
    // Create channel
    const channel = new Channel({
      name,
      slug,
      description,
      type,
      category,
      createdBy: userId,
      members: [{
        userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });
    
    await channel.save();
    
    logger.info({ channelId: channel._id, userId }, 'Channel created');
    
    res.status(201).json({
      message: 'Channel created successfully',
      channel: {
        id: channel._id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        type: channel.type,
        category: channel.category
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error creating channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create channel'
    });
  }
}

// Join a channel
export async function joinChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if channel is private
    if (channel.type === 'private') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot join private channel without invitation'
      });
      return;
    }
    
    // Add user to channel
    await channel.addMember(new mongoose.Types.ObjectId(userId));
    
    logger.info({ channelId, userId }, 'User joined channel');
    
    res.json({
      message: 'Successfully joined channel'
    });
  } catch (error) {
    logger.error({ error }, 'Error joining channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to join channel'
    });
  }
}

// Leave a channel
export async function leaveChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user is owner
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    if (memberRole === 'owner') {
      res.status(400).json({
        error: 'Cannot leave',
        message: 'Channel owner cannot leave. Transfer ownership first.'
      });
      return;
    }
    
    // Remove user from channel
    await channel.removeMember(new mongoose.Types.ObjectId(userId));
    
    logger.info({ channelId, userId }, 'User left channel');
    
    res.json({
      message: 'Successfully left channel'
    });
  } catch (error) {
    logger.error({ error }, 'Error leaving channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to leave channel'
    });
  }
}

// Get messages from a channel
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Check if user has access to channel (handle both ID and slug)
    const channel = await Channel.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(channelId) ? { _id: channelId } : {},
        { slug: channelId }
      ].filter(q => Object.keys(q).length > 0)
    });
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    if (channel.type !== 'public' && !channel.isMember(new mongoose.Types.ObjectId(userId))) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this channel'
      });
      return;
    }
    
    // Build query
    const query: any = { 
      channelId: channel._id,
      isDeleted: false
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }
    
    // Get messages
    const messages = await Message.find(query)
      .populate('userId', 'name email')
      .populate('replyTo', 'content userId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));
    
    res.json({
      messages: messages.reverse().map(message => ({
        id: message._id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        attachments: message.attachments,
        reactions: message.reactions,
        replyTo: message.replyTo,
        isPinned: message.isPinned,
        editedAt: message.editedAt,
        createdAt: message.createdAt
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching messages');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch messages'
    });
  }
}

// Send a message
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    const { content, type = 'text', attachments, replyTo } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!content && !attachments) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Message content or attachment is required'
      });
      return;
    }
    
    // Check if user has access to channel (handle both ID and slug)
    const channel = await Channel.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(channelId) ? { _id: channelId } : {},
        { slug: channelId }
      ].filter(q => Object.keys(q).length > 0)
    });
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    if (channel.type !== 'public' && !channel.isMember(new mongoose.Types.ObjectId(userId))) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this channel'
      });
      return;
    }
    
    // Create message
    const message = new Message({
      channelId: channel._id,
      userId,
      content,
      type,
      attachments,
      replyTo
    });
    
    await message.save();
    
    // Update channel's last message info
    channel.lastMessageAt = message.createdAt;
    channel.lastMessagePreview = content.substring(0, 100);
    await channel.save();
    
    // Populate user info for response
    await message.populate('userId', 'name email');
    
    // Handle mentions and notifications
    try {
      if (content && type === 'text') {
        // Extract mentions from message content
        const mentions = extractMentions(content);
        
        if (mentions.length > 0) {
          // Find mentioned users
          const mentionedUsers = await findMentionedUsers(mentions, channel._id.toString());
          
          // Get sender info
          const sender = await User.findById(userId).select('name');
          const senderName = sender?.name || 'Someone';
          
          // Create mention notifications
          for (const mentionedUser of mentionedUsers) {
            // Don't notify if user mentions themselves
            if (mentionedUser._id.toString() !== userId) {
              try {
                await notificationService.createMentionNotification(
                  mentionedUser._id.toString(),
                  senderName,
                  channel._id.toString(),
                  message._id.toString(),
                  channel.type === 'direct' ? undefined : channel.name
                );
                
                logger.info({
                  mentionedUserId: mentionedUser._id,
                  messageId: message._id,
                  channelId: channel._id
                }, 'Mention notification created');
              } catch (notificationError) {
                logger.error({ error: notificationError }, 'Failed to create mention notification');
                // Don't fail the message send if notification fails
              }
            }
          }
        }
        
        // For direct messages, create a notification for the other user
        if (channel.type === 'direct') {
          const otherMember = channel.members.find(
            m => m.userId.toString() !== userId
          );
          
          if (otherMember) {
            try {
              const sender = await User.findById(userId).select('name');
              const senderName = sender?.name || 'Someone';
              
              await notificationService.createDirectMessageNotification(
                otherMember.userId.toString(),
                senderName,
                content,
                channel._id.toString(),
                message._id.toString()
              );
              
              logger.info({
                recipientId: otherMember.userId,
                messageId: message._id,
                channelId: channel._id
              }, 'Direct message notification created');
            } catch (notificationError) {
              logger.error({ error: notificationError }, 'Failed to create direct message notification');
              // Don't fail the message send if notification fails
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error processing message notifications');
      // Don't fail the message send if notification processing fails
    }
    
    logger.info({ messageId: message._id, channelId, userId }, 'Message sent');
    
    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: message._id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        attachments: message.attachments,
        replyTo: message.replyTo,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error sending message');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to send message'
    });
  }
}

// Edit a message
export async function editMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!content) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Message content is required'
      });
      return;
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404).json({
        error: 'Not found',
        message: 'Message not found'
      });
      return;
    }
    
    // Check if user is the author
    if (!message.userId.equals(userId)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only edit your own messages'
      });
      return;
    }
    
    // Edit message
    await message.edit(content);
    
    logger.info({ messageId, userId }, 'Message edited');
    
    res.json({
      message: 'Message edited successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error editing message');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to edit message'
    });
  }
}

// Search messages in a channel
export async function searchMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    const { query, limit = 20 } = req.query;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Search query is required'
      });
      return;
    }
    
    // Check if user has access to channel (handle both ID and slug)
    const channel = await Channel.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(channelId) ? { _id: channelId } : {},
        { slug: channelId }
      ].filter(q => Object.keys(q).length > 0)
    });
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    if (channel.type !== 'public' && !channel.isMember(new mongoose.Types.ObjectId(userId))) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this channel'
      });
      return;
    }
    
    // Search messages using text index
    const messages = await Message.find({
      channelId: channel._id,
      isDeleted: false,
      $text: { $search: query }
    })
    .populate('userId', 'name email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit as string));
    
    res.json({
      query,
      results: messages.map(message => ({
        id: message._id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
        score: (message as any).score
      })),
      count: messages.length
    });
  } catch (error) {
    logger.error({ error }, 'Error searching messages');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to search messages'
    });
  }
}

// Get or create a direct message channel between two users
export async function getOrCreateDirectChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { targetUserId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Invalid target user ID'
      });
      return;
    }
    
    if (userId === targetUserId) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Cannot create direct message with yourself'
      });
      return;
    }
    
    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }
    
    // Sort user IDs to ensure consistent channel lookup
    const sortedUserIds = [userId, targetUserId].sort();
    
    // Check if direct channel already exists
    let channel = await Channel.findOne({
      type: 'direct',
      'members.userId': { $all: sortedUserIds }
    }).populate('members.userId', 'name email avatar');
    
    if (!channel) {
      // Create new direct channel
      const currentUser = await User.findById(userId);
      
      // Create a readable slug using usernames
      const userNames = [currentUser?.name, targetUser.name]
        .map(name => name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        .sort()
        .join('-and-');
      
      // Use the other user's name as the channel name (will be displayed in UI)
      const channelName = targetUser.name;
      
      channel = new Channel({
        name: channelName,
        slug: `dm-${userNames}`,
        description: `Direct messages between ${currentUser?.name} and ${targetUser.name}`,
        type: 'direct',
        members: [
          { userId: sortedUserIds[0], role: 'member', joinedAt: new Date() },
          { userId: sortedUserIds[1], role: 'member', joinedAt: new Date() }
        ],
        createdBy: userId,
        isArchived: false
      });
      
      await channel.save();
      await channel.populate('members.userId', 'name email avatar');
      
      logger.info({ channelId: channel._id, userId, targetUserId }, 'Direct channel created');
    }
    
    // Get the other user's info for the response
    const otherUser = channel.members.find(
      m => m.userId._id.toString() !== userId
    )?.userId;
    
    res.json({
      channel: {
        id: channel._id,
        name: otherUser ? (otherUser as any).name : 'Direct Message',
        slug: channel.slug,
        description: channel.description,
        type: channel.type,
        otherUser: otherUser ? {
          id: (otherUser as any)._id,
          name: (otherUser as any).name,
          email: (otherUser as any).email,
          avatar: (otherUser as any).avatar
        } : null,
        lastMessageAt: channel.lastMessageAt,
        lastMessagePreview: channel.lastMessagePreview
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error getting/creating direct channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get or create direct channel'
    });
  }
}

// Get all users for DM selection
export async function getAvailableUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get all users except the current user
    // Don't filter by isActive as it might not be set for all users
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }, // Include users without isActive field
        { isActive: null }
      ]
    })
    .select('name email avatar lastActive isActive')
    .sort({ name: 1 });
    
    logger.info({ userId, userCount: users.length }, 'Fetching available users for DM');
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.lastActive && (Date.now() - user.lastActive.getTime() < 5 * 60 * 1000) // Online if active in last 5 minutes
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching available users');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch users'
    });
  }
}

// Delete a message
export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { messageId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404).json({
        error: 'Not found',
        message: 'Message not found'
      });
      return;
    }
    
    // Check if user can delete (author or admin)
    if (!message.userId.equals(userId) && userRole !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own messages'
      });
      return;
    }
    
    // Soft delete message
    await message.softDelete();
    
    logger.info({ messageId, userId }, 'Message deleted');
    
    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting message');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete message'
    });
  }
}

// Get channel members
export async function getChannelMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId)
      .populate('members.userId', 'name email avatar lastActive');
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user has access to channel
    if (channel.type !== 'public' && !channel.isMember(new mongoose.Types.ObjectId(userId))) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this channel'
      });
      return;
    }
    
    res.json({
      members: channel.members.map(member => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching channel members');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch channel members'
    });
  }
}

// Update channel information
export async function updateChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    const { name, description } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user is admin or owner
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    if (memberRole !== 'admin' && memberRole !== 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can update channel information'
      });
      return;
    }
    
    // Update channel
    if (name) {
      channel.name = name;
      channel.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description !== undefined) {
      channel.description = description;
    }
    
    await channel.save();
    
    logger.info({ channelId, userId }, 'Channel updated');
    
    res.json({
      message: 'Channel updated successfully',
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error updating channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update channel'
    });
  }
}

// Delete channel
export async function deleteChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user is owner
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    if (memberRole !== 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only channel owner can delete the channel'
      });
      return;
    }
    
    // Archive channel instead of deleting
    channel.isArchived = true;
    await channel.save();
    
    logger.info({ channelId, userId }, 'Channel deleted (archived)');
    
    res.json({
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting channel');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete channel'
    });
  }
}

// Remove member from channel
export async function removeChannelMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId, memberId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user is admin or owner
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    if (memberRole !== 'admin' && memberRole !== 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can remove members'
      });
      return;
    }
    
    // Cannot remove owner
    const targetMemberRole = channel.getMemberRole(new mongoose.Types.ObjectId(memberId));
    if (targetMemberRole === 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot remove channel owner'
      });
      return;
    }
    
    // Remove member
    channel.members = channel.members.filter(
      m => !m.userId.equals(new mongoose.Types.ObjectId(memberId))
    );
    channel.memberCount = channel.members.length;
    await channel.save();
    
    logger.info({ channelId, memberId, userId }, 'Member removed from channel');
    
    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error removing channel member');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to remove member'
    });
  }
}

// Pin a message
export async function pinMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { messageId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const message = await Message.findById(messageId).populate('channelId');
    
    if (!message) {
      res.status(404).json({
        error: 'Not found',
        message: 'Message not found'
      });
      return;
    }
    
    // Get channel to check permissions
    const channel = await Channel.findById(message.channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user can pin messages (admin, owner, or message author)
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    const canPin = memberRole === 'owner' || memberRole === 'admin' || 
                   message.userId.equals(userId) || userRole === 'admin';
    
    if (!canPin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to pin messages in this channel'
      });
      return;
    }
    
    if (message.isPinned) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Message is already pinned'
      });
      return;
    }
    
    await message.pin();
    
    logger.info({ messageId, channelId: channel._id, userId }, 'Message pinned');
    
    res.json({
      message: 'Message pinned successfully',
      data: {
        messageId: message._id,
        isPinned: true
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error pinning message');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to pin message'
    });
  }
}

// Unpin a message
export async function unpinMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { messageId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const message = await Message.findById(messageId).populate('channelId');
    
    if (!message) {
      res.status(404).json({
        error: 'Not found',
        message: 'Message not found'
      });
      return;
    }
    
    // Get channel to check permissions
    const channel = await Channel.findById(message.channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user can unpin messages (admin, owner, or message author)
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    const canUnpin = memberRole === 'owner' || memberRole === 'admin' || 
                     message.userId.equals(userId) || userRole === 'admin';
    
    if (!canUnpin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to unpin messages in this channel'
      });
      return;
    }
    
    if (!message.isPinned) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Message is not pinned'
      });
      return;
    }
    
    await message.unpin();
    
    logger.info({ messageId, channelId: channel._id, userId }, 'Message unpinned');
    
    res.json({
      message: 'Message unpinned successfully',
      data: {
        messageId: message._id,
        isPinned: false
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error unpinning message');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to unpin message'
    });
  }
}

// Get pinned messages for a channel
export async function getPinnedMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Check if user has access to channel
    const channel = await Channel.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(channelId) ? { _id: channelId } : {},
        { slug: channelId }
      ].filter(q => Object.keys(q).length > 0)
    });
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    if (channel.type !== 'public' && !channel.isMember(new mongoose.Types.ObjectId(userId))) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this channel'
      });
      return;
    }
    
    // Get pinned messages
    const pinnedMessages = await Message.find({
      channelId: channel._id,
      isPinned: true,
      isDeleted: false
    })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(50); // Limit to 50 pinned messages
    
    res.json({
      pinnedMessages: pinnedMessages.map(message => ({
        id: message._id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        isPinned: message.isPinned,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        reactions: message.reactions
      })),
      count: pinnedMessages.length
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching pinned messages');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch pinned messages'
    });
  }
}

// Update member role
export async function updateChannelMemberRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { channelId, memberId } = req.params;
    const { role } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!['member', 'admin'].includes(role)) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Invalid role. Must be "member" or "admin"'
      });
      return;
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      res.status(404).json({
        error: 'Not found',
        message: 'Channel not found'
      });
      return;
    }
    
    // Check if user is owner
    const memberRole = channel.getMemberRole(new mongoose.Types.ObjectId(userId));
    if (memberRole !== 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only channel owner can change member roles'
      });
      return;
    }
    
    // Find and update member role
    const member = channel.members.find(
      m => m.userId.equals(new mongoose.Types.ObjectId(memberId))
    );
    
    if (!member) {
      res.status(404).json({
        error: 'Not found',
        message: 'Member not found in channel'
      });
      return;
    }
    
    // Cannot change owner role
    if (member.role === 'owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot change owner role'
      });
      return;
    }
    
    member.role = role as 'member' | 'admin';
    await channel.save();
    
    logger.info({ channelId, memberId, role, userId }, 'Member role updated');
    
    res.json({
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error updating member role');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update member role'
    });
  }
}