import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
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
export async function getCourses(req: Request, res: Response): Promise<void> {
  try {
    const courses = await Course.find({ isPublished: true })
      .sort({ order: 1, createdAt: -1 });
    
    // Simple response for now
    const coursesData = courses.map(course => ({
      id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      instructor: course.instructor,
      level: course.level,
      duration: course.duration,
      tags: course.tags,
      moduleCount: 3,
      totalLessons: 12,
      completedLessons: 0,
      progress: 0,
      belt: course.level === 'advanced' ? 'roxa' : course.level === 'intermediate' ? 'azul' : 'branca',
      isLocked: false,
      students: Math.floor(Math.random() * 500) + 100,
      currentLesson: null
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
    
    // Check if user has access (free lesson or paid user)
    if (!lesson.isFree && !req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to access this lesson'
      });
      return;
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
        isLocked: index > 0 && modulesWithLessons[index - 1].lessons.length > 0, // Lock if previous module not completed
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