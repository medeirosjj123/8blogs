import api from './api';

export const progressService = {
  // Mark lesson as completed
  async markLessonComplete(_lessonId: string) {
    const response = await api.post(`/api/progress/lessons/${_lessonId}/complete`);
    return response.data;
  },

  // Update lesson progress
  async updateLessonProgress(_lessonId: string, progress: number, watchTime?: number) {
    const response = await api.put(`/api/progress/lessons/${_lessonId}`, {
      progress,
      watchTime
    });
    return response.data;
  },

  // Get user's overall progress
  async getUserProgress() {
    const response = await api.get('/api/progress/user');
    return response.data.data || response.data;
  },

  // Get course-specific progress
  async getCourseProgress(_courseId: string) {
    const response = await api.get(`/api/progress/courses/${_courseId}`);
    return response.data.data || response.data;
  },

  // Get module progress
  async getModuleProgress(_moduleId: string) {
    const response = await api.get(`/api/progress/modules/${_moduleId}`);
    return response.data.data || response.data;
  },

  // Track quiz attempt
  async submitQuizAttempt(_lessonId: string, score: number, answers: any[]) {
    const response = await api.post(`/api/progress/quiz/${_lessonId}`, {
      score,
      answers,
      completedAt: new Date().toISOString()
    });
    return response.data;
  },

  // Get learning streak
  async getLearningStreak() {
    const response = await api.get('/api/progress/streak');
    return response.data.data || response.data;
  },

  // Get achievements
  async getAchievements() {
    const response = await api.get('/api/progress/achievements');
    return response.data.data || response.data;
  }
};