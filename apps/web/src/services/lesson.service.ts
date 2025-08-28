import api from './api';

export const lessonService = {
  // Get single lesson
  async getLesson(lessonId: string) {
    const response = await api.get(`/courses/lessons/${lessonId}`);
    return response.data.data || response.data;
  },

  // Get module with lessons
  async getModule(moduleId: string) {
    const response = await api.get(`/courses/modules/${moduleId}`);
    return response.data.data || response.data.module;
  },

  // Get course details
  async getCourse(courseId: string) {
    const response = await api.get(`/courses/${courseId}`);
    return response.data.data || response.data;
  },

  // Mark lesson as started
  async startLesson(lessonId: string) {
    const response = await api.post(`/progress/lessons/${lessonId}/start`);
    return response.data;
  },

  // Update lesson progress
  async updateProgress(lessonId: string, progress: number) {
    const response = await api.put(`/progress/lessons/${lessonId}`, {
      progress,
      watchTime: Math.floor(progress * 30) // Estimate based on 30 min average
    });
    return response.data;
  },

  // Mark lesson as completed
  async completeLesson(lessonId: string) {
    const response = await api.post(`/progress/lessons/${lessonId}/complete`);
    return response.data;
  },

  // Get user progress for a course
  async getCourseProgress(courseId: string) {
    const response = await api.get(`/progress/courses/${courseId}`);
    return response.data.data || response.data;
  }
};