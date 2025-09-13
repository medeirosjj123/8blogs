import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { User } from '../models/User';
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

// Get all published courses
export async function debugUserPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    
    res.json({
      success: true,
      data: {
        userId: req.user.userId,
        userEmail: user?.email,
        directPlan: user?.plan,
        subscription: user?.subscription,
        calculatedPlan: user?.plan || user?.subscription?.plan || 'starter',
        isBlackBelt: (user?.plan || user?.subscription?.plan || 'starter') === 'black_belt'
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error in debug endpoint');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug info'
    });
  }
}

export async function getCourses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('modules')
      .sort({ order: 1, createdAt: -1 });
    
    // Check user plan for course access (handle both authenticated and unauthenticated requests)
    let userPlan = 'starter';
    if (req.user) {
      try {
        const user = await User.findById(req.user.userId);
        userPlan = user?.plan || user?.subscription?.plan || 'starter';
        
        // Debug logging
        logger.info({
          userId: req.user.userId,
          userEmail: user?.email,
          directPlan: user?.plan,
          subscriptionPlan: user?.subscription?.plan,
          finalUserPlan: userPlan,
          isBlackBelt: userPlan === 'black_belt'
        }, 'Course access plan check');
      } catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Could not fetch user plan, defaulting to starter');
      }
    }
    
    // Map courses with real module data
    const coursesData = await Promise.all(courses.map(async (course) => {
      const modules = await Module.find({ courseId: course._id }).populate('lessons');
      const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
      
      // Courses are only accessible to Black Belt users
      const isLocked = userPlan !== 'black_belt';
      
      // Debug logging for each course
      if (course.title.includes('SEO') || course.title.includes('Introdução')) {
        logger.info({
          courseTitle: course.title,
          userPlan,
          isLocked,
          lockLogic: `${userPlan} !== 'black_belt' = ${isLocked}`
        }, 'Course lock status');
      }
      
      return {
        id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        level: course.level,
        duration: course.duration,
        tags: course.tags,
        moduleCount: modules.length,
        totalLessons,
        completedLessons: 0,
        progress: 0,
        belt: course.level === 'advanced' ? 'roxa' : course.level === 'intermediate' ? 'azul' : 'branca',
        isLocked,
        students: Math.floor(Math.random() * 500) + 100,
        currentLesson: null
      };
    }));
    
    res.json({
      success: true,
      data: coursesData
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching courses');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch courses' }
    });
  }
}

// Get single course with modules
export async function getCourse(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(courseId) ? { _id: courseId } : {},
        { slug: courseId }
      ].filter(q => Object.keys(q).length > 0),
      isPublished: true
    }).populate({
      path: 'modules',
      match: { isPublished: true },
      options: { sort: { order: 1 } },
      select: 'title slug description order duration lessonCount'
    });
    
    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Course not found' }
      });
      return;
    }
    
    // Check user plan for course access
    if (req.user) {
      try {
        const user = await User.findById(req.user.userId);
        const userPlan = user?.plan || user?.subscription?.plan || 'starter';
        if (userPlan !== 'black_belt') {
          res.status(403).json({
            success: false,
            error: { message: 'Black Belt plan required to access courses' }
          });
          return;
        }
      } catch (error) {
        logger.error({ error }, 'Error checking user plan for course access');
        res.status(500).json({
          success: false,
          error: { message: 'Failed to check user access' }
        });
        return;
      }
    } else {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required to access courses' }
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        level: course.level,
        duration: course.duration,
        tags: course.tags,
        requirements: course.requirements,
        objectives: course.objectives,
        modules: course.modules || []
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching course');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch course'
    });
  }
}

// Get module with lessons
export async function getModule(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;
    
    const module = await Module.findOne({
      $or: [
        { _id: moduleId },
        { slug: moduleId }
      ],
      isPublished: true
    }).populate({
      path: 'lessons',
      match: { isPublished: true },
      options: { sort: { order: 1 } },
      select: 'title slug description type duration isFree order'
    });
    
    if (!module) {
      res.status(404).json({
        error: 'Not found',
        message: 'Module not found'
      });
      return;
    }
    
    // Get course info
    const course = await Course.findById(module.courseId)
      .select('title slug');
    
    res.json({
      module: {
        id: module._id,
        courseId: module.courseId,
        courseTitle: course?.title,
        courseSlug: course?.slug,
        title: module.title,
        slug: module.slug,
        description: module.description,
        order: module.order,
        duration: module.duration,
        lessons: module.lessons
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching module');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch module'
    });
  }
}

// Get single lesson
export async function getLesson(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    
    const lesson = await Lesson.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(lessonId) ? { _id: lessonId } : {},
        { slug: lessonId }
      ].filter(q => Object.keys(q).length > 0),
      isPublished: true
    });
    
    if (!lesson) {
      res.status(404).json({
        error: 'Not found',
        message: 'Lesson not found'
      });
      return;
    }
    
    // Check if user has access (free lesson or black belt user)
    if (!lesson.isFree) {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required to access this lesson'
        });
        return;
      }
      
      // Check if user has Black Belt plan
      try {
        const user = await User.findById(req.user.userId);
        const userPlan = user?.plan || user?.subscription?.plan || 'starter';
        if (userPlan !== 'black_belt') {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Black Belt plan required to access this lesson'
          });
          return;
        }
      } catch (error) {
        logger.error({ error }, 'Error checking user plan for lesson access');
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to check user access'
        });
        return;
      }
    }
    
    // Get module and course info
    const module = await Module.findById(lesson.moduleId)
      .select('title slug courseId');
    const course = await Course.findById(lesson.courseId)
      .select('title slug');
    
    // Get next and previous lessons
    const siblingLessons = await Lesson.find({
      moduleId: lesson.moduleId,
      isPublished: true
    }).sort({ order: 1 }).select('_id slug title order');
    
    const currentIndex = siblingLessons.findIndex(l => l._id.equals(lesson._id));
    const previousLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;
    
    res.json({
      success: true,
      data: {
        id: lesson._id,
        moduleId: lesson.moduleId,
        courseId: lesson.courseId,
        moduleTitle: module?.title,
        moduleSlug: module?.slug,
        courseTitle: course?.title,
        courseSlug: course?.slug,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        type: lesson.type,
        order: lesson.order,
        duration: lesson.duration,
        videoUrl: lesson.videoUrl,
        videoProvider: lesson.videoProvider,
        videoId: lesson.videoId,
        content: lesson.content,
        materials: lesson.materials,
        questions: lesson.type === 'quiz' ? [
          {
            id: '1',
            question: 'Qual é a importância das meta tags para SEO?',
            options: [
              'Não têm importância',
              'São fundamentais para descrever o conteúdo da página',
              'Apenas servem para estética',
              'São usadas apenas pelo Google'
            ],
            correctAnswer: 1,
            explanation: 'Meta tags são fundamentais para descrever o conteúdo da página aos mecanismos de busca.'
          },
          {
            id: '2',
            question: 'O que é uma palavra-chave long tail?',
            options: [
              'Uma palavra curta',
              'Uma frase com múltiplas palavras e intenção específica',
              'Qualquer palavra-chave',
              'Palavras em inglês'
            ],
            correctAnswer: 1,
            explanation: 'Long tail keywords são frases mais longas e específicas que geralmente têm menos competição.'
          }
        ] : undefined,
        isFree: lesson.isFree,
        previousLesson: previousLesson ? {
          id: previousLesson._id,
          slug: previousLesson.slug,
          title: previousLesson.title
        } : null,
        nextLesson: nextLesson ? {
          id: nextLesson._id,
          slug: nextLesson.slug,
          title: nextLesson.title
        } : null
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching lesson');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch lesson'
    });
  }
}

// Get course modules (simplified list)
export async function getCourseModules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    
    const course = await Course.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(courseId) ? { _id: courseId } : {},
        { slug: courseId }
      ].filter(q => Object.keys(q).length > 0),
      isPublished: true
    }).select('_id title');
    
    if (!course) {
      res.status(404).json({
        success: false,
        error: { message: 'Course not found' }
      });
      return;
    }
    
    // Check user plan for course access
    if (req.user) {
      try {
        const user = await User.findById(req.user.userId);
        const userPlan = user?.plan || user?.subscription?.plan || 'starter';
        if (userPlan !== 'black_belt') {
          res.status(403).json({
            success: false,
            error: { message: 'Black Belt plan required to access courses' }
          });
          return;
        }
      } catch (error) {
        logger.error({ error }, 'Error checking user plan for course modules access');
        res.status(500).json({
          success: false,
          error: { message: 'Failed to check user access' }
        });
        return;
      }
    } else {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required to access courses' }
      });
      return;
    }
    
    const modules = await Module.find({
      courseId: course._id,
      isPublished: true
    }).sort({ order: 1 });
    
    // Get lessons for each module separately to avoid population issues
    const modulesWithLessons = await Promise.all(modules.map(async (module) => {
      const lessons = await Lesson.find({
        moduleId: module._id,
        isPublished: true
      }).sort({ order: 1 }).select('title slug type duration isFree');
      
      return {
        ...module.toObject(),
        lessons
      };
    }));
    
    // Check user plan for course access
    let userPlan = 'starter';
    if (req.user) {
      try {
        const user = await User.findById(req.user.userId);
        userPlan = user?.plan || user?.subscription?.plan || 'starter';
      } catch (error) {
        logger.warn('Could not fetch user plan for module access');
      }
    }
    
    // Get user progress if user is authenticated
    let userProgress = [];
    if (userId) {
      try {
        const { LessonProgress } = await import('../models/LessonProgress');
        userProgress = await LessonProgress.find({ userId });
      } catch (error) {
        logger.warn('LessonProgress model not available');
      }
    }
    
    const modulesWithProgress = modulesWithLessons.map((module, index) => {
      const lessonIds = module.lessons.map(l => l._id.toString());
      const completedLessons = userProgress.filter(p => 
        lessonIds.includes(p.lessonId?.toString()) && 
        p.status === 'completed'
      ).length;
      
      const progress = module.lessons.length > 0 
        ? Math.round((completedLessons / module.lessons.length) * 100) 
        : 0;
      
      // For Black Belt users, modules are never locked
      // For other users, modules are locked by plan
      const isLockedByPlan = userPlan !== 'black_belt';
      
      // Sequential locking only applies to non-Black Belt users
      // (Black Belt users get full access)
      let isLockedBySequence = false;
      if (userPlan !== 'black_belt' && index > 0) {
        // For non-Black Belt users, check if previous module is completed
        const previousModuleProgress = modulesWithProgress[index - 1]?.progress || 0;
        isLockedBySequence = previousModuleProgress < 100;
      }
      
      const finalIsLocked = isLockedByPlan || isLockedBySequence;
      
      logger.info({
        moduleTitle: module.title,
        moduleIndex: index,
        userPlan,
        isBlackBelt: userPlan === 'black_belt',
        isLockedByPlan,
        isLockedBySequence,
        finalIsLocked
      }, 'Module lock calculation');
      
      return {
        id: module._id,
        title: module.title,
        slug: module.slug,
        description: module.description,
        order: module.order,
        duration: module.duration,
        lessonCount: module.lessons.length,
        completedLessons,
        progress,
        isLocked: finalIsLocked,
        lessons: module.lessons
      };
    });
    
    res.json({
      success: true,
      data: modulesWithProgress
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching course modules');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch course modules' }
    });
  }
}

// Create new course
export async function createCourse(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const courseData = req.body;
    
    // Generate slug from title
    const slug = courseData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    const newCourse = new Course({
      ...courseData,
      slug,
      instructor: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedCourse = await newCourse.save();
    
    logger.info('Course created:', savedCourse._id);
    
    res.status(201).json({
      success: true,
      data: savedCourse,
      message: 'Curso criado com sucesso'
    });
  } catch (error) {
    logger.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

// Update course
export async function updateCourse(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { courseId } = req.params;
    const courseData = req.body;

    // Update slug if title changed
    if (courseData.title) {
      courseData.slug = courseData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { 
        ...courseData, 
        updatedAt: new Date() 
      },
      { new: true }
    );

    if (!updatedCourse) {
      res.status(404).json({
        success: false,
        message: 'Curso não encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: updatedCourse,
      message: 'Curso atualizado com sucesso'
    });
  } catch (error) {
    logger.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

// Delete course
export async function deleteCourse(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { courseId } = req.params;
    
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      res.status(404).json({
        success: false,
        message: 'Curso não encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Curso deletado com sucesso'
    });
  } catch (error) {
    logger.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}