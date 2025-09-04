import { Request, Response } from 'express';
import { WeeklyCall } from '../models/WeeklyCall';
import { CallRegistration } from '../models/CallRegistration';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

// Get all calls with filters and pagination
export const getAllCalls = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status = 'all',
      page = 1,
      limit = 10,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    let filter: any = {};
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    // Build sort query
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Get calls with participant counts
    const calls = await WeeklyCall.find(filter)
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get participant counts for each call
    const callsWithCounts = await Promise.all(
      calls.map(async (call) => {
        const registrationStats = await CallRegistration.getCallStats(call._id.toString());
        const stats = registrationStats[0] || {
          totalRegistered: 0,
          totalAttended: 0,
          totalCancelled: 0,
          totalWaitlisted: 0,
          averageRating: null,
          averageDuration: null
        };

        return {
          ...call,
          currentParticipants: stats.totalRegistered,
          attendedCount: stats.totalAttended,
          cancelledCount: stats.totalCancelled,
          waitlistedCount: stats.totalWaitlisted,
          averageRating: stats.averageRating,
          averageDuration: stats.averageDuration,
          availableSpots: Math.max(0, call.maxParticipants - stats.totalRegistered),
          isFull: stats.totalRegistered >= call.maxParticipants
        };
      })
    );

    const total = await WeeklyCall.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        calls: callsWithCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls'
    });
  }
};

// Get upcoming calls for users
export const getUpcomingCalls = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const calls = await WeeklyCall.findUpcoming()
      .populate('createdBy', 'name')
      .lean();

    // Add registration status for each call
    const callsWithRegistration = await Promise.all(
      calls.map(async (call) => {
        let isRegistered = false;
        let registration = null;

        if (userId) {
          registration = await CallRegistration.findOne({
            userId,
            callId: call._id,
            cancelledAt: { $exists: false }
          });
          isRegistered = !!registration;
        }

        const registrationStats = await CallRegistration.getCallStats(call._id.toString());
        const stats = registrationStats[0] || {
          totalRegistered: 0,
          totalAttended: 0,
          totalCancelled: 0,
          totalWaitlisted: 0
        };

        return {
          ...call,
          isRegistered,
          waitlisted: registration?.waitlisted || false,
          currentParticipants: stats.totalRegistered,
          availableSpots: Math.max(0, call.maxParticipants - stats.totalRegistered),
          isFull: stats.totalRegistered >= call.maxParticipants,
          canRegister: stats.totalRegistered < call.maxParticipants &&
                      new Date() < call.date &&
                      (!call.registrationDeadline || new Date() <= call.registrationDeadline) &&
                      call.status === 'upcoming'
        };
      })
    );

    res.json({
      success: true,
      data: callsWithRegistration
    });
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming calls'
    });
  }
};

// Get past calls with recordings
export const getPastCalls = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const calls = await WeeklyCall.findPast()
      .populate('createdBy', 'name')
      .limit(20) // Limit to recent 20
      .lean();

    // Filter to only show recordings for registered users or admins
    const callsWithAccess = await Promise.all(
      calls.map(async (call) => {
        let hasAccess = req.user?.role === 'admin';
        let wasRegistered = false;

        if (userId) {
          const registration = await CallRegistration.findOne({
            userId,
            callId: call._id,
            cancelledAt: { $exists: false }
          });
          wasRegistered = !!registration;
          hasAccess = hasAccess || wasRegistered;
        }

        const registrationStats = await CallRegistration.getCallStats(call._id.toString());
        const stats = registrationStats[0] || {
          totalRegistered: 0,
          totalAttended: 0,
          averageRating: null
        };

        return {
          ...call,
          wasRegistered,
          hasAccess,
          recordingLink: hasAccess ? call.recordingLink : null,
          totalParticipants: stats.totalRegistered,
          attendedCount: stats.totalAttended,
          averageRating: stats.averageRating
        };
      })
    );

    res.json({
      success: true,
      data: callsWithAccess
    });
  } catch (error) {
    console.error('Error fetching past calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch past calls'
    });
  }
};

// Get single call details
export const getCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const call = await WeeklyCall.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Get registration info
    let registration = null;
    if (userId) {
      registration = await CallRegistration.findOne({
        userId,
        callId: id
      });
    }

    // Get call statistics
    const registrationStats = await CallRegistration.getCallStats(id);
    const stats = registrationStats[0] || {
      totalRegistered: 0,
      totalAttended: 0,
      totalCancelled: 0,
      totalWaitlisted: 0,
      averageRating: null,
      averageDuration: null
    };

    res.json({
      success: true,
      data: {
        ...call,
        registration,
        stats: {
          totalRegistered: stats.totalRegistered,
          totalAttended: stats.totalAttended,
          totalCancelled: stats.totalCancelled,
          totalWaitlisted: stats.totalWaitlisted,
          averageRating: stats.averageRating,
          averageDuration: stats.averageDuration,
          attendanceRate: stats.totalRegistered > 0 ? 
            Math.round((stats.totalAttended / stats.totalRegistered) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call'
    });
  }
};

// Create new call (admin only)
export const createCall = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      title,
      description,
      date,
      duration,
      maxParticipants,
      zoomLink,
      topics,
      registrationDeadline,
      isRecurring,
      recurringPattern
    } = req.body;

    // Validate required fields
    if (!title || !description || !date || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, date, and duration are required'
      });
    }

    // Validate date is in the future
    const callDate = new Date(date);
    if (callDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Call date must be in the future'
      });
    }

    const call = new WeeklyCall({
      title: title.trim(),
      description: description.trim(),
      date: callDate,
      duration,
      maxParticipants: maxParticipants || 25,
      zoomLink: zoomLink?.trim(),
      topics: topics || [],
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : undefined,
      createdBy: userId
    });

    await call.save();
    await call.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: call,
      message: 'Call created successfully'
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create call'
    });
  }
};

// Update call (admin only)
export const updateCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.registeredUsers;
    delete updateData.attendedUsers;

    // Validate date if being updated
    if (updateData.date) {
      const callDate = new Date(updateData.date);
      if (callDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Call date must be in the future'
        });
      }
    }

    const call = await WeeklyCall.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      data: call,
      message: 'Call updated successfully'
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update call'
    });
  }
};

// Delete call (admin only)
export const deleteCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const call = await WeeklyCall.findById(id);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Don't allow deletion of calls with registrations unless it's cancelled
    const hasRegistrations = call.registeredUsers.length > 0;
    if (hasRegistrations && call.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete call with active registrations. Cancel it first.'
      });
    }

    // Delete all related registrations
    await CallRegistration.deleteMany({ callId: id });
    
    // Delete the call
    await WeeklyCall.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete call'
    });
  }
};

// Register user for call
export const registerForCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const call = await WeeklyCall.findById(id);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Check if user has Black Belt access using the same logic as usage endpoint
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Import the plan defaults function
    const { applyPlanDefaults } = await import('../utils/planConfig');
    let subscription = user.subscription || applyPlanDefaults('starter');
    
    if (!subscription.features?.weeklyCalls) {
      return res.status(403).json({
        success: false,
        error: 'Black Belt subscription required for weekly calls'
      });
    }

    // Check if already registered
    const existingRegistration = await CallRegistration.findOne({
      userId,
      callId: id,
      cancelledAt: { $exists: false }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'Already registered for this call'
      });
    }

    // Check if call is full
    const currentRegistrations = await CallRegistration.countDocuments({
      callId: id,
      cancelledAt: { $exists: false },
      waitlisted: false
    });

    const isWaitlisted = currentRegistrations >= call.maxParticipants;

    // Create registration
    const registration = new CallRegistration({
      userId,
      callId: id,
      waitlisted: isWaitlisted,
      waitlistPosition: isWaitlisted ? 
        await CallRegistration.countDocuments({ callId: id, waitlisted: true }) + 1 : 
        undefined
    });

    await registration.save();

    // Update call's registered users if not waitlisted
    if (!isWaitlisted) {
      await WeeklyCall.findByIdAndUpdate(id, {
        $push: { registeredUsers: userId }
      });
    }

    res.json({
      success: true,
      data: {
        registration,
        waitlisted: isWaitlisted,
        message: isWaitlisted ? 
          'Added to waitlist - you will be notified if a spot opens up' :
          'Successfully registered for the call'
      }
    });
  } catch (error) {
    console.error('Error registering for call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register for call'
    });
  }
};

// Unregister user from call
export const unregisterFromCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const registration = await CallRegistration.findOne({
      userId,
      callId: id,
      cancelledAt: { $exists: false }
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    // Cancel the registration
    await registration.cancel('User cancelled');

    // Remove from call's registered users
    await WeeklyCall.findByIdAndUpdate(id, {
      $pull: { registeredUsers: userId }
    });

    // If this was not a waitlisted registration, promote someone from waitlist
    if (!registration.waitlisted) {
      const nextWaitlisted = await CallRegistration.findOne({
        callId: id,
        waitlisted: true,
        cancelledAt: { $exists: false }
      }).sort({ registeredAt: 1 });

      if (nextWaitlisted) {
        await nextWaitlisted.promoteFromWaitlist();
        await WeeklyCall.findByIdAndUpdate(id, {
          $push: { registeredUsers: nextWaitlisted.userId }
        });
        // TODO: Send notification to promoted user
      }
    }

    res.json({
      success: true,
      message: 'Successfully unregistered from call'
    });
  } catch (error) {
    console.error('Error unregistering from call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister from call'
    });
  }
};

// Get call participants (admin only)
export const getCallParticipants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { includeWaitlist = true } = req.query;

    let filter: any = { callId: id };
    if (includeWaitlist === 'false') {
      filter.waitlisted = false;
    }

    const participants = await CallRegistration.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ registeredAt: 1 });

    const registeredCount = participants.filter(p => !p.waitlisted).length;
    const waitlistedCount = participants.filter(p => p.waitlisted).length;
    const attendedCount = participants.filter(p => p.attended).length;

    res.json({
      success: true,
      data: {
        participants,
        summary: {
          registered: registeredCount,
          waitlisted: waitlistedCount,
          attended: attendedCount,
          total: participants.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
};

// Update call recording (admin only)
export const updateRecording = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recordingLink } = req.body;

    if (!recordingLink) {
      return res.status(400).json({
        success: false,
        error: 'Recording link is required'
      });
    }

    const call = await WeeklyCall.findByIdAndUpdate(
      id,
      { 
        recordingLink: recordingLink.trim(),
        status: 'completed'
      },
      { new: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      data: call,
      message: 'Recording link updated successfully'
    });
  } catch (error) {
    console.error('Error updating recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recording'
    });
  }
};