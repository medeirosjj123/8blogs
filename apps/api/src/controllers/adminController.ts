import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { LessonProgress } from '../models/LessonProgress';
import { emailService } from '../services/email.service';
import mongoose from 'mongoose';

// Dashboard Statistics
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalLessons,
      activeUsers,
      totalProgress
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Lesson.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      LessonProgress.countDocuments()
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const completionRates = await LessonProgress.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $group: {
          _id: '$courseId',
          totalEnrollments: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
          },
          courseName: { $first: { $arrayElemAt: ['$course.title', 0] } }
        }
      },
      {
        $project: {
          courseName: 1,
          totalEnrollments: 1,
          completedCount: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalEnrollments', 0] },
              { $multiply: [{ $divide: ['$completedCount', '$totalEnrollments'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalCourses,
          totalLessons,
          activeUsers,
          totalProgress
        },
        usersByRole: usersByRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        completionRates
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// User Management
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-passwordHash -magicLinkToken -emailVerificationToken -passwordResetToken -twoFactorSecret -twoFactorBackupCodes')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['starter', 'pro', 'black_belt', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Get subscription settings for the new role (unless admin)
    const updateData: any = { role };
    if (role !== 'admin') {
      updateData.subscription = getSubscriptionForRole(role);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`Admin ${req.user.email} updated user ${user.email} role to ${role} with subscription plan ${updateData.subscription?.plan || 'unchanged'}`);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't allow deleting other admins
    if (user.role === 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Cannot delete other admin users' });
    }

    await User.findByIdAndDelete(userId);
    await LessonProgress.deleteMany({ userId });

    console.log(`Admin ${req.user.email} deleted user ${user.email}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Helper function to get subscription settings based on role
const getSubscriptionForRole = (role: string) => {
  switch (role) {
    case 'black_belt':
      return {
        plan: 'black_belt' as const,
        blogsLimit: -1, // unlimited
        reviewsLimit: -1, // unlimited
        features: {
          bulkUpload: true,
          weeklyCalls: true,
          coursesAccess: true,
          prioritySupport: true
        }
      };
    case 'pro':
      return {
        plan: 'pro' as const,
        blogsLimit: 5,
        reviewsLimit: 100,
        features: {
          bulkUpload: false,
          weeklyCalls: true,
          coursesAccess: false,
          prioritySupport: true
        }
      };
    case 'starter':
    default:
      return {
        plan: 'starter' as const,
        blogsLimit: 1,
        reviewsLimit: 30,
        features: {
          bulkUpload: false,
          weeklyCalls: false,
          coursesAccess: false,
          prioritySupport: false
        }
      };
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Get subscription settings for the role
    const subscription = getSubscriptionForRole(role || 'starter');

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash,
      role: role || 'starter',
      isActive: isActive !== false,
      emailVerified: true, // Set as verified since admin is creating
      subscription
    });

    await user.save();

    console.log(`Admin ${req.user?.email || 'unknown'} created user ${user.email} with role ${user.role}`);

    res.status(201).json({ 
      success: true, 
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, password, role, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    // Update password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    console.log(`Admin ${req.user.email} updated user ${user.email}`);

    res.json({ 
      success: true, 
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(userId).select('+passwordResetToken +passwordResetExpiresAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    user.passwordHash = await bcrypt.hash(password, 10);
    
    // Clear any existing reset tokens
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    
    // Clear any magic link tokens as well
    user.magicLinkToken = undefined;
    user.magicLinkExpiresAt = undefined;
    
    // Clear login attempts since password was successfully reset
    user.loginAttempts = 0;
    user.lockedUntil = undefined;

    await user.save();

    console.log(`Admin ${req.user.email} reset password for user ${user.email}`);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendPasswordResetEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpiresAt');
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (for security)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // Send email with reset link
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken, user.name);
    
    if (!emailResult.success) {
      console.error(`Failed to send password reset email to ${email}: ${emailResult.error}`);
    } else {
      console.log(`Password reset email sent to ${email} with message ID: ${emailResult.messageId}`);
    }
    
    console.log(`Admin ${req.user.email} requested password reset email for ${email}`);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Course Management
export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const courses = await Course.find()
      .populate('modules', 'title description order')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Creating course with data:', req.body);
    console.log('Thumbnail received:', req.body.thumbnail);
    
    // Generate slug from title
    const slug = req.body.title
      ?.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    if (!slug) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required to generate slug' 
      });
    }

    const courseData = {
      ...req.body,
      slug,
      instructor: (req.user as any)._id.toString(), // Course model expects instructor, not createdBy
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const course = new Course(courseData);
    await course.save();

    console.log(`Admin ${(req.user as any).email} created course: ${course.title} with thumbnail: ${course.thumbnail}`);

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Error creating course:', error);
    
    // Send more detailed error information
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: validationErrors
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    console.log('Updating course with ID:', courseId);
    console.log('Update data:', req.body);
    console.log('Thumbnail in update:', req.body.thumbnail);

    const course = await Course.findByIdAndUpdate(
      courseId,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    console.log(`Admin ${req.user.email} updated course: ${course.title} with thumbnail: ${course.thumbnail}`);

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Delete associated modules and lessons
    const modules = await Module.find({ courseId });
    for (const module of modules) {
      await Lesson.deleteMany({ moduleId: module._id });
    }
    await Module.deleteMany({ courseId });
    
    // Delete progress records
    await LessonProgress.deleteMany({ courseId });

    await Course.findByIdAndDelete(courseId);

    console.log(`Admin ${req.user.email} deleted course: ${course.title}`);

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Module Management
export const getModules = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const modules = await Module.find({ courseId })
      .populate('lessons', 'title type duration order')
      .sort({ order: 1 });

    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    // Get the next order number
    const lastModule = await Module.findOne({ courseId }).sort({ order: -1 });
    const order = lastModule ? lastModule.order + 1 : 1;

    const moduleData = {
      ...req.body,
      slug: req.body.title
        ?.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim(),
      courseId,
      order,
      createdBy: req.user._id
    };

    const module = new Module(moduleData);
    await module.save();

    // Update course to include this module
    await Course.findByIdAndUpdate(courseId, {
      $push: { modules: module._id }
    });

    console.log(`Admin ${req.user.email} created module: ${module.title}`);

    res.status(201).json({ success: true, data: module });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;

    const module = await Module.findByIdAndUpdate(
      moduleId,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    console.log(`Admin ${req.user.email} updated module: ${module.title}`);

    res.json({ success: true, data: module });
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteModule = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Delete associated lessons
    await Lesson.deleteMany({ moduleId });
    
    // Remove from course
    await Course.findByIdAndUpdate(module.courseId, {
      $pull: { modules: moduleId }
    });

    await Module.findByIdAndDelete(moduleId);

    console.log(`Admin ${req.user.email} deleted module: ${module.title}`);

    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Lesson Management
export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;

    const lessons = await Lesson.find({ moduleId })
      .sort({ order: 1 });

    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;

    // Get module to extract courseId
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Get the next order number
    const lastLesson = await Lesson.findOne({ moduleId }).sort({ order: -1 });
    const order = lastLesson ? lastLesson.order + 1 : 1;

    // Generate slug from title
    const slug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Transform quiz data if present
    let quizData = undefined;
    if (req.body.type === 'quiz' && req.body.questions) {
      quizData = {
        questions: req.body.questions.map((q: any) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        })),
        passingScore: req.body.requiredToPass || 70
      };
    }

    const lessonData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      duration: req.body.duration,
      content: req.body.content,
      videoUrl: req.body.videoUrl,
      videoProvider: req.body.videoProvider,
      videoId: req.body.videoId,
      isFree: req.body.isFree,
      xpReward: req.body.xpReward,
      quiz: quizData,
      moduleId,
      courseId: module.courseId,
      order,
      slug,
      isPublished: true,
      createdBy: req.user._id
    };

    // Remove undefined fields
    Object.keys(lessonData).forEach(key => {
      if (lessonData[key] === undefined) {
        delete lessonData[key];
      }
    });

    console.log('Creating lesson with data:', lessonData);

    const lesson = new Lesson(lessonData);
    await lesson.save();

    // Update module to include this lesson
    await Module.findByIdAndUpdate(moduleId, {
      $push: { lessons: lesson._id }
    });

    console.log(`Admin ${req.user.email} created lesson: ${lesson.title}`);

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;

    // Transform quiz data if present
    let quizData = undefined;
    if (req.body.type === 'quiz' && req.body.questions) {
      quizData = {
        questions: req.body.questions.map((q: any) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        })),
        passingScore: req.body.requiredToPass || 70
      };
    }

    // Generate slug from title if title is being updated
    let slug = undefined;
    if (req.body.title) {
      slug = req.body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      duration: req.body.duration,
      content: req.body.content,
      videoUrl: req.body.videoUrl,
      videoProvider: req.body.videoProvider,
      videoId: req.body.videoId,
      isFree: req.body.isFree,
      xpReward: req.body.xpReward,
      quiz: quizData,
      slug,
      order: req.body.order,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('Updating lesson with data:', updateData);

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      updateData,
      { new: true }
    );

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    console.log(`Admin ${req.user.email} updated lesson: ${lesson.title}`);

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Remove from module
    await Module.findByIdAndUpdate(lesson.moduleId, {
      $pull: { lessons: lessonId }
    });

    await Lesson.findByIdAndDelete(lessonId);

    console.log(`Admin ${req.user.email} deleted lesson: ${lesson.title}`);

    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};