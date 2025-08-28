import { Response } from 'express';
import { LessonProgress } from '../models/LessonProgress';
import { Lesson } from '../models/Lesson';
import { Module } from '../models/Module';
import { Course } from '../models/Course';
import { AuthRequest } from '../middlewares/authMiddleware';
import pino from 'pino';

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

// Mark lesson as completed
export async function completeLesson(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get lesson details
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      res.status(404).json({
        error: 'Not found',
        message: 'Lesson not found'
      });
      return;
    }
    
    // Find or create progress record
    let progress = await LessonProgress.findOne({
      userId,
      lessonId
    });
    
    if (!progress) {
      progress = new LessonProgress({
        userId,
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        lessonId: lesson._id
      });
    }
    
    await progress.markAsCompleted();
    
    logger.info({ 
      userId, 
      lessonId, 
      progressId: progress._id 
    }, 'Lesson marked as completed');
    
    res.json({
      message: 'Lesson completed successfully',
      progress: {
        id: progress._id,
        status: progress.status,
        completedAt: progress.completedAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error completing lesson');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to complete lesson'
    });
  }
}

// Update lesson progress (for video tracking)
export async function updateLessonProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const { position, duration } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (typeof position !== 'number' || typeof duration !== 'number') {
      res.status(400).json({
        error: 'Invalid data',
        message: 'Position and duration must be numbers'
      });
      return;
    }
    
    // Get lesson details
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      res.status(404).json({
        error: 'Not found',
        message: 'Lesson not found'
      });
      return;
    }
    
    // Find or create progress record
    let progress = await LessonProgress.findOne({
      userId,
      lessonId
    });
    
    if (!progress) {
      progress = new LessonProgress({
        userId,
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        lessonId: lesson._id
      });
    }
    
    await progress.updateWatchTime(position, duration);
    
    res.json({
      message: 'Progress updated',
      progress: {
        id: progress._id,
        status: progress.status,
        lastPosition: progress.lastPosition,
        watchTime: progress.watchTime
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error updating lesson progress');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update progress'
    });
  }
}

// Get course progress
export async function getCourseProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get course details
    const course = await Course.findById(courseId);
    
    if (!course) {
      res.status(404).json({
        error: 'Not found',
        message: 'Course not found'
      });
      return;
    }
    
    // Get all lessons in the course
    const modules = await Module.find({ courseId }).populate('lessons');
    const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    
    // Get user's progress for this course
    const progress = await LessonProgress.find({
      userId,
      courseId
    });
    
    const completedLessons = progress.filter(p => p.status === 'completed').length;
    const inProgressLessons = progress.filter(p => p.status === 'in_progress').length;
    
    // Calculate module progress
    const moduleProgress = await Promise.all(
      modules.map(async (module) => {
        const moduleProgressData = await LessonProgress.find({
          userId,
          moduleId: module._id
        });
        
        const moduleCompleted = moduleProgressData.filter(p => p.status === 'completed').length;
        const moduleTotal = module.lessons.length;
        
        return {
          moduleId: module._id,
          moduleTitle: module.title,
          completed: moduleCompleted,
          total: moduleTotal,
          percentage: moduleTotal > 0 ? Math.round((moduleCompleted / moduleTotal) * 100) : 0
        };
      })
    );
    
    const overallPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;
    
    res.json({
      courseId,
      courseTitle: course.title,
      progress: {
        totalLessons,
        completedLessons,
        inProgressLessons,
        notStartedLessons: totalLessons - completedLessons - inProgressLessons,
        percentage: overallPercentage
      },
      moduleProgress,
      lessonProgress: progress.map(p => ({
        lessonId: p.lessonId,
        status: p.status,
        completedAt: p.completedAt,
        lastPosition: p.lastPosition,
        watchTime: p.watchTime
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching course progress');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch course progress'
    });
  }
}

// Get user's overall progress
export async function getUserProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get all user progress
    const allProgress = await LessonProgress.find({ userId });
    
    // Group by course
    const courseIds = [...new Set(allProgress.map(p => p.courseId.toString()))];
    
    const coursesProgress = await Promise.all(
      courseIds.map(async (courseId) => {
        const course = await Course.findById(courseId).select('title slug thumbnail');
        const courseProgress = allProgress.filter(p => p.courseId.toString() === courseId);
        
        const completed = courseProgress.filter(p => p.status === 'completed').length;
        const inProgress = courseProgress.filter(p => p.status === 'in_progress').length;
        
        // Get total lessons in course
        const modules = await Module.find({ courseId }).populate('lessons');
        const total = modules.reduce((sum, module) => sum + module.lessons.length, 0);
        
        return {
          courseId,
          courseTitle: course?.title,
          courseSlug: course?.slug,
          courseThumbnail: course?.thumbnail,
          completedLessons: completed,
          inProgressLessons: inProgress,
          totalLessons: total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          lastAccessedAt: courseProgress.reduce((latest, p) => {
            return p.updatedAt > latest ? p.updatedAt : latest;
          }, new Date(0))
        };
      })
    );
    
    // Calculate overall stats
    const totalCompleted = allProgress.filter(p => p.status === 'completed').length;
    const totalInProgress = allProgress.filter(p => p.status === 'in_progress').length;
    const totalWatchTime = allProgress.reduce((sum, p) => sum + (p.totalWatchTime || 0), 0);
    
    res.json({
      overall: {
        coursesEnrolled: courseIds.length,
        lessonsCompleted: totalCompleted,
        lessonsInProgress: totalInProgress,
        totalWatchTime: Math.round(totalWatchTime / 60), // Convert to minutes
      },
      courses: coursesProgress.sort((a, b) => 
        b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime()
      )
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching user progress');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch user progress'
    });
  }
}