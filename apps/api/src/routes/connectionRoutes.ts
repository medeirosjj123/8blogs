import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';
import { Connection } from '../models/Connection';
import { User } from '../models/User';
import type { ConnectionStatus } from '@tatame/types';

const router = Router();

// Send connection request
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { toUserId, message } = req.body;

    if (!toUserId) {
      res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
      return;
    }

    if (toUserId === req.user?.userId) {
      res.status(400).json({
        success: false,
        error: 'Cannot connect with yourself'
      });
      return;
    }

    // Check if target user exists
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { fromUserId: req.user?.userId, toUserId },
        { fromUserId: toUserId, toUserId: req.user?.userId }
      ]
    });

    if (existingConnection) {
      res.status(400).json({
        success: false,
        error: 'Connection already exists',
        data: {
          status: existingConnection.status
        }
      });
      return;
    }

    // Create new connection request
    const connection = new Connection({
      fromUserId: req.user?.userId,
      toUserId,
      message: message?.slice(0, 500),
      status: 'pending'
    });

    await connection.save();

    res.status(201).json({
      success: true,
      data: {
        id: connection._id,
        fromUserId: connection.fromUserId,
        toUserId: connection.toUserId,
        status: connection.status,
        message: connection.message,
        createdAt: connection.createdAt
      }
    });
  } catch (error) {
    console.error('Connection request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send connection request'
    });
  }
});

// Get user's connections
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'accepted', page = 1, limit = 20 } = req.query;

    const currentPage = parseInt(page as string);
    const pageLimit = parseInt(limit as string);
    const skip = (currentPage - 1) * pageLimit;

    const query: any = {
      $or: [
        { fromUserId: req.user?.userId },
        { toUserId: req.user?.userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    // Get total count
    const totalConnections = await Connection.countDocuments(query);

    // Get connections with pagination
    const connections = await Connection.find(query)
      .populate('fromUserId', 'name bio avatar location abilities interests role')
      .populate('toUserId', 'name bio avatar location abilities interests role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    // Format connections data
    const formattedConnections = connections.map(conn => {
      const isFromUser = conn.fromUserId._id.toString() === req.user?.userId;
      const otherUser = isFromUser ? conn.toUserId : conn.fromUserId;

      return {
        id: conn._id,
        user: {
          id: otherUser._id,
          name: otherUser.name,
          bio: otherUser.bio,
          avatar: otherUser.avatar,
          location: otherUser.location,
          abilities: otherUser.abilities,
          interests: otherUser.interests,
          role: otherUser.role
        },
        status: conn.status,
        message: conn.message,
        isIncoming: !isFromUser && conn.status === 'pending',
        createdAt: conn.createdAt,
        acceptedAt: conn.acceptedAt
      };
    });

    res.json({
      success: true,
      data: {
        connections: formattedConnections,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total: totalConnections,
          totalPages: Math.ceil(totalConnections / pageLimit)
        }
      }
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connections'
    });
  }
});

// Get pending connection requests
router.get('/pending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get incoming pending requests
    const incomingRequests = await Connection.find({
      toUserId: req.user?.userId,
      status: 'pending'
    })
    .populate('fromUserId', 'name bio avatar location abilities interests role')
    .sort({ createdAt: -1 });

    // Get outgoing pending requests
    const outgoingRequests = await Connection.find({
      fromUserId: req.user?.userId,
      status: 'pending'
    })
    .populate('toUserId', 'name bio avatar location abilities interests role')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        incoming: incomingRequests.map(req => ({
          id: req._id,
          user: {
            id: req.fromUserId._id,
            name: req.fromUserId.name,
            bio: req.fromUserId.bio,
            avatar: req.fromUserId.avatar,
            location: req.fromUserId.location,
            abilities: req.fromUserId.abilities,
            interests: req.fromUserId.interests,
            role: req.fromUserId.role
          },
          message: req.message,
          createdAt: req.createdAt
        })),
        outgoing: outgoingRequests.map(req => ({
          id: req._id,
          user: {
            id: req.toUserId._id,
            name: req.toUserId.name,
            bio: req.toUserId.bio,
            avatar: req.toUserId.avatar,
            location: req.toUserId.location,
            abilities: req.toUserId.abilities,
            interests: req.toUserId.interests,
            role: req.toUserId.role
          },
          message: req.message,
          createdAt: req.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending requests'
    });
  }
});

// Accept connection request
router.put('/:connectionId/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findOne({
      _id: connectionId,
      toUserId: req.user?.userId,
      status: 'pending'
    });

    if (!connection) {
      res.status(404).json({
        success: false,
        error: 'Connection request not found'
      });
      return;
    }

    connection.status = 'accepted';
    connection.acceptedAt = new Date();
    await connection.save();

    // Update connection counts for both users
    await User.findByIdAndUpdate(connection.fromUserId, { $inc: { connectionCount: 1 } });
    await User.findByIdAndUpdate(connection.toUserId, { $inc: { connectionCount: 1 } });

    res.json({
      success: true,
      data: {
        id: connection._id,
        status: connection.status,
        acceptedAt: connection.acceptedAt
      }
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept connection request'
    });
  }
});

// Reject connection request
router.put('/:connectionId/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findOne({
      _id: connectionId,
      toUserId: req.user?.userId,
      status: 'pending'
    });

    if (!connection) {
      res.status(404).json({
        success: false,
        error: 'Connection request not found'
      });
      return;
    }

    connection.status = 'rejected';
    connection.rejectedAt = new Date();
    await connection.save();

    res.json({
      success: true,
      data: {
        id: connection._id,
        status: connection.status,
        rejectedAt: connection.rejectedAt
      }
    });
  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject connection request'
    });
  }
});

// Remove/cancel connection
router.delete('/:connectionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findOne({
      _id: connectionId,
      $or: [
        { fromUserId: req.user?.userId },
        { toUserId: req.user?.userId }
      ]
    });

    if (!connection) {
      res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
      return;
    }

    // If connection was accepted, update connection counts
    if (connection.status === 'accepted') {
      await User.findByIdAndUpdate(connection.fromUserId, { $inc: { connectionCount: -1 } });
      await User.findByIdAndUpdate(connection.toUserId, { $inc: { connectionCount: -1 } });
    }

    await connection.deleteOne();

    res.json({
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove connection'
    });
  }
});

// Block user
router.put('/:userId/block', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if connection exists
    let connection = await Connection.findOne({
      $or: [
        { fromUserId: req.user?.userId, toUserId: userId },
        { fromUserId: userId, toUserId: req.user?.userId }
      ]
    });

    if (connection) {
      // Update existing connection to blocked
      if (connection.status === 'accepted') {
        // Update connection counts
        await User.findByIdAndUpdate(connection.fromUserId, { $inc: { connectionCount: -1 } });
        await User.findByIdAndUpdate(connection.toUserId, { $inc: { connectionCount: -1 } });
      }

      connection.status = 'blocked';
      connection.blockedAt = new Date();
      await connection.save();
    } else {
      // Create new blocked connection
      connection = new Connection({
        fromUserId: req.user?.userId,
        toUserId: userId,
        status: 'blocked',
        blockedAt: new Date()
      });
      await connection.save();
    }

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user'
    });
  }
});

export default router;