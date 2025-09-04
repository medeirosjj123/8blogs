import api from './api';

export const lessonService = {
  // Get single lesson
  async getLesson(_lessonId: string) {
    const response = await api.get(`/api/courses/lessons/${_lessonId}`);
    return response.data.data || response.data;
  },

  // Get module with lessons
  async getModule(_moduleId: string) {
    const response = await api.get(`/api/courses/modules/${_moduleId}`);
    return response.data.data || response.data.module;
  },

  // Get course details
  async getCourse(_courseId: string) {
    const response = await api.get(`/api/courses/${_courseId}`);
    return response.data.data || response.data;
  },

  // Mark lesson as started
  async startLesson(_lessonId: string) {
    const response = await api.post(`/api/progress/lessons/${_lessonId}/start`);
    return response.data;
  },

  // Update lesson progress
  async updateProgress(_lessonId: string, progress: number) {
    const response = await api.put(`/api/progress/lessons/${_lessonId}`, {
      progress,
      watchTime: Math.floor(progress * 30) // Estimate based on 30 min average
    });
    return response.data;
  },

  // Mark lesson as completed
  async completeLesson(_lessonId: string) {
    const response = await api.post(`/api/progress/lessons/${_lessonId}/complete`);
    return response.data;
  },

  // Get user progress for a course
  async getCourseProgress(_courseId: string) {
    const response = await api.get(`/api/progress/courses/${_courseId}`);
    return response.data.data || response.data;
  }
};