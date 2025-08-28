import api from './api';

export const progressService = {
  // Mark lesson as completed
  async markLessonComplete(lessonId: string) {
    const response = await api.post(`/progress/lessons/${lessonId}/complete`);
    return response.data;
  },

  // Update lesson progress
  async updateLessonProgress(lessonId: string, progress: number, watchTime?: number) {
    const response = await api.put(`/progress/lessons/${lessonId}`, {
      progress,
      watchTime
    });
    return response.data;
  },

  // Get user's overall progress
  async getUserProgress() {
    const response = await api.get('/progress/user');
    return response.data.data || response.data;
  },

  // Get course-specific progress
  async getCourseProgress(courseId: string) {
    const response = await api.get(`/progress/courses/${courseId}`);
    return response.data.data || response.data;
  },

  // Get module progress
  async getModuleProgress(moduleId: string) {
    const response = await api.get(`/progress/modules/${moduleId}`);
    return response.data.data || response.data;
  },

  // Track quiz attempt
  async submitQuizAttempt(lessonId: string, score: number, answers: any[]) {
    const response = await api.post(`/progress/quiz/${lessonId}`, {
      score,
      answers,
      completedAt: new Date().toISOString()
    });
    return response.data;
  },

  // Get learning streak
  async getLearningStreak() {
    const response = await api.get('/progress/streak');
    return response.data.data || response.data;
  },

  // Get achievements
  async getAchievements() {
    const response = await api.get('/progress/achievements');
    return response.data.data || response.data;
  }
};