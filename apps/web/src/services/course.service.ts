import api from './api';
import type { IApiResponse, ICourse, IModule, ILesson, ILessonProgress } from '@tatame/types';

export interface CourseWithProgress extends ICourse {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  currentLesson?: ILesson;
  belt: string;
  isLocked: boolean;
}

export interface ModuleWithProgress extends IModule {
  progress: number;
  completedLessons: number;
  isLocked: boolean;
}

class CourseService {
  async getCourses(): Promise<CourseWithProgress[]> {
    const response = await api.get<IApiResponse<CourseWithProgress[]>>('/courses');
    return response.data.data!;
  }

  async getCourse(courseId: string): Promise<CourseWithProgress> {
    const response = await api.get<IApiResponse<CourseWithProgress>>(`/courses/${courseId}`);
    return response.data.data!;
  }

  async getModules(courseId: string): Promise<ModuleWithProgress[]> {
    const response = await api.get<IApiResponse<ModuleWithProgress[]>>(`/courses/${courseId}/modules`);
    return response.data.data!;
  }

  async getLessons(moduleId: string): Promise<ILesson[]> {
    const response = await api.get<IApiResponse<ILesson[]>>(`/modules/${moduleId}/lessons`);
    return response.data.data!;
  }

  async getLesson(lessonId: string): Promise<ILesson> {
    const response = await api.get<IApiResponse<ILesson>>(`/lessons/${lessonId}`);
    return response.data.data!;
  }

  async markLessonComplete(lessonId: string): Promise<ILessonProgress> {
    const response = await api.post<IApiResponse<ILessonProgress>>(`/progress/lessons/${lessonId}/complete`);
    return response.data.data!;
  }

  async updateVideoProgress(lessonId: string, position: number): Promise<void> {
    await api.post(`/progress/lessons/${lessonId}/video`, { position });
  }

  async getProgress(): Promise<ILessonProgress[]> {
    const response = await api.get<IApiResponse<ILessonProgress[]>>('/progress');
    return response.data.data!;
  }
}

export default new CourseService();