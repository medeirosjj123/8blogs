import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { Connection } from '../models/Connection';

const router = Router();

// Get all users for discovery with filters
router.get('/discover', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      abilities, 
      interests, 
      lookingFor, 
      availability,
      search,
      page = 1,
      limit = 20 
    } = req.query;

    const currentPage = parseInt(page as string);
    const pageLimit = parseInt(limit as string);
    const skip = (currentPage - 1) * pageLimit;

    // Build query
    const query: any = {
      _id: { $ne: req.user?.userId }, // Exclude current user
      emailVerified: true // Only show verified users
    };

    // Apply filters
    if (abilities) {
      const abilitiesArray = (abilities as string).split(',');
      query.abilities = { $in: abilitiesArray };
    }

    if (interests) {
      const interestsArray = (interests as string).split(',');
      query.interests = { $in: interestsArray };
    }

    if (lookingFor) {
      const lookingForArray = (lookingFor as string).split(',');
      query.lookingFor = { $in: lookingForArray };
    }

    if (availability) {
      query.availability = availability;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { abilities: { $in: [new RegExp(search as string, 'i')] } },
        { interests: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    // Get total count
    const totalUsers = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .select('name bio avatar location abilities interests lookingFor availability role connectionCount')
      .sort({ profileCompleteness: -1, connectionCount: -1 })
      .skip(skip)
      .limit(pageLimit);

    // Get connection status for each user
    const userIds = users.map(u => u._id);
    const connections = await Connection.find({
      $or: [
        { fromUserId: req.user?.userId, toUserId: { $in: userIds } },
        { toUserId: req.user?.userId, fromUserId: { $in: userIds } }
      ]
    });

    // Map connection status to users
    const usersWithConnectionStatus = users.map(user => {
      const connection = connections.find(c => 
        c.fromUserId.toString() === user._id.toString() || 
        c.toUserId.toString() === user._id.toString()
      );

      return {
        id: user._id,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        abilities: user.abilities,
        interests: user.interests,
        lookingFor: user.lookingFor,
        availability: user.availability,
        role: user.role,
        connectionCount: user.connectionCount,
        connectionStatus: connection?.status || null,
        connectionId: connection?._id || null
      };
    });

    res.json({
      success: true,
      data: {
        users: usersWithConnectionStatus,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / pageLimit)
        }
      }
    });
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get recommended users based on shared interests/abilities
router.get('/discover/recommended', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await User.findById(req.user?.userId)
      .select('abilities interests lookingFor');

    if (!currentUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Build recommendation query
    const query: any = {
      _id: { $ne: req.user?.userId },
      emailVerified: true,
      availability: { $ne: 'not_interested' }
    };

    // Find users with shared interests or abilities
    if (currentUser.abilities?.length || currentUser.interests?.length) {
      query.$or = [];
      
      if (currentUser.abilities?.length) {
        query.$or.push({ abilities: { $in: currentUser.abilities } });
      }
      
      if (currentUser.interests?.length) {
        query.$or.push({ interests: { $in: currentUser.interests } });
      }
    }

    // Get users with matching criteria
    const recommendedUsers = await User.find(query)
      .select('name bio avatar location abilities interests lookingFor availability role connectionCount')
      .sort({ profileCompleteness: -1 })
      .limit(10);

    // Get connection status
    const userIds = recommendedUsers.map(u => u._id);
    const connections = await Connection.find({
      $or: [
        { fromUserId: req.user?.userId, toUserId: { $in: userIds } },
        { toUserId: req.user?.userId, fromUserId: { $in: userIds } }
      ],
      status: { $ne: 'rejected' }
    });

    // Filter out already connected users and map data
    const filteredUsers = recommendedUsers
      .filter(user => {
        const connection = connections.find(c => 
          c.fromUserId.toString() === user._id.toString() || 
          c.toUserId.toString() === user._id.toString()
        );
        return !connection || connection.status === 'pending';
      })
      .map(user => {
        const connection = connections.find(c => 
          c.fromUserId.toString() === user._id.toString() || 
          c.toUserId.toString() === user._id.toString()
        );

        // Calculate match score
        let matchScore = 0;
        if (currentUser.abilities) {
          const sharedAbilities = user.abilities?.filter(a => 
            currentUser.abilities!.includes(a)
          ).length || 0;
          matchScore += sharedAbilities * 2;
        }
        if (currentUser.interests) {
          const sharedInterests = user.interests?.filter(i => 
            currentUser.interests!.includes(i)
          ).length || 0;
          matchScore += sharedInterests;
        }

        return {
          id: user._id,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar,
          location: user.location,
          abilities: user.abilities,
          interests: user.interests,
          lookingFor: user.lookingFor,
          availability: user.availability,
          role: user.role,
          connectionCount: user.connectionCount,
          connectionStatus: connection?.status || null,
          connectionId: connection?._id || null,
          matchScore,
          sharedAbilities: user.abilities?.filter(a => 
            currentUser.abilities?.includes(a)
          ),
          sharedInterests: user.interests?.filter(i => 
            currentUser.interests?.includes(i)
          )
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: filteredUsers
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

// Get user profile by ID
router.get('/profile/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-passwordHash -magicLinkToken -emailVerificationToken -passwordResetToken -twoFactorSecret -twoFactorBackupCodes');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Get connection status
    const connection = await Connection.findOne({
      $or: [
        { fromUserId: req.user?.userId, toUserId: userId },
        { toUserId: req.user?.userId, fromUserId: userId }
      ]
    });

    // Get mutual connections count
    const userConnections = await Connection.find({
      $or: [
        { fromUserId: userId, status: 'accepted' },
        { toUserId: userId, status: 'accepted' }
      ]
    }).select('fromUserId toUserId');

    const currentUserConnections = await Connection.find({
      $or: [
        { fromUserId: req.user?.userId, status: 'accepted' },
        { toUserId: req.user?.userId, status: 'accepted' }
      ]
    }).select('fromUserId toUserId');

    // Calculate mutual connections
    const userConnectionIds = new Set(
      userConnections.flatMap(c => [
        c.fromUserId.toString(),
        c.toUserId.toString()
      ]).filter(id => id !== userId)
    );

    const currentUserConnectionIds = new Set(
      currentUserConnections.flatMap(c => [
        c.fromUserId.toString(),
        c.toUserId.toString()
      ]).filter(id => id !== req.user?.userId)
    );

    const mutualConnectionsCount = [...userConnectionIds].filter(id => 
      currentUserConnectionIds.has(id)
    ).length;

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        socialLinks: user.socialLinks,
        role: user.role,
        abilities: user.abilities,
        interests: user.interests,
        lookingFor: user.lookingFor,
        availability: user.availability,
        connectionCount: user.connectionCount,
        profileCompleteness: user.profileCompleteness,
        createdAt: user.createdAt,
        connectionStatus: connection?.status || null,
        connectionId: connection?._id || null,
        mutualConnectionsCount
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update user's networking profile
router.put('/profile/networking', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { abilities, interests, lookingFor, availability } = req.body;

    const updateData: any = {};
    
    if (abilities !== undefined) {
      updateData.abilities = abilities;
    }
    
    if (interests !== undefined) {
      updateData.interests = interests;
    }
    
    if (lookingFor !== undefined) {
      updateData.lookingFor = lookingFor;
    }
    
    if (availability !== undefined) {
      updateData.availability = availability;
    }

    // Calculate profile completeness
    const user = await User.findById(req.user?.userId);
    if (user) {
      let completeness = 0;
      const fields = ['name', 'bio', 'avatar', 'location', 'abilities', 'interests', 'lookingFor'];
      
      fields.forEach(field => {
        const value = updateData[field] !== undefined ? updateData[field] : user[field];
        if (value && (Array.isArray(value) ? value.length > 0 : true)) {
          completeness += 100 / fields.length;
        }
      });
      
      updateData.profileCompleteness = Math.round(completeness);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      updateData,
      { new: true }
    ).select('abilities interests lookingFor availability profileCompleteness');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update networking profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update networking profile'
    });
  }
});

export default router;