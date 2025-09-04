// Shared types for Tatame platform

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type UserRole = 'admin' | 'user' | 'moderator';

export interface IUser {
  _id: string;
  id?: string; // For backward compatibility
  email: string;
  name?: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  status?: string; // For backward compatibility
  isActive?: boolean;
  subscription?: {
    plan: string;
    blogsLimit: number;
    reviewsLimit: number;
    reviewsUsed: number;
    features: {
      bulkUpload: boolean;
      weeklyCalls: boolean;
      coursesAccess: boolean;
      prioritySupport: boolean;
    };
    nextResetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourse {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  isPublished: boolean;
  modules: IModule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IModule {
  _id: string;
  title: string;
  description: string;
  order: number;
  lessons: ILesson[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILesson {
  _id: string;
  title: string;
  description: string;
  content?: string;
  videoUrl?: string;
  order: number;
  duration?: number; // in minutes
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILessonProgress {
  _id: string;
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt?: Date;
  timeSpent?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}