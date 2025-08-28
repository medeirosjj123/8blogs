import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class AdminService {
  private getAuthHeaders() {
    const cookieToken = Cookies.get('access_token');
    const localToken = localStorage.getItem('token');
    const token = cookieToken || localToken;
    
    console.log('Admin Service - Getting token:', {
      cookieToken,
      localToken,
      finalToken: token
    });
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}/admin${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    // Most endpoints return data in data.data
    if (data.data !== undefined) {
      return data.data as T;
    }
    
    // Some endpoints might return the whole response
    return data as unknown as T;
  }

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/dashboard');
  }

  // User Management
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    
    const query = queryParams.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPassword(userId: string, password: string) {
    return this.request(`/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  async sendPasswordResetEmail(email: string) {
    return this.request('/users/send-reset-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Course Management
  async getCourses() {
    return this.request('/courses');
  }

  async createCourse(courseData: any) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(courseId: string, courseData: any) {
    return this.request(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(courseId: string) {
    return this.request(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // Module Management
  async getModules(courseId: string) {
    return this.request(`/courses/${courseId}/modules`);
  }

  async createModule(courseId: string, moduleData: any) {
    return this.request(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  async updateModule(moduleId: string, moduleData: any) {
    return this.request(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    });
  }

  async deleteModule(moduleId: string) {
    return this.request(`/modules/${moduleId}`, {
      method: 'DELETE',
    });
  }

  // Lesson Management
  async getLessons(moduleId: string) {
    return this.request(`/modules/${moduleId}/lessons`);
  }

  async createLesson(moduleId: string, lessonData: any) {
    return this.request(`/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  async updateLesson(lessonId: string, lessonData: any) {
    return this.request(`/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  }

  async deleteLesson(lessonId: string) {
    return this.request(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  }

  // Upload Management
  async uploadThumbnail(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const cookieToken = Cookies.get('access_token');
    const localToken = localStorage.getItem('token');
    const token = cookieToken || localToken;

    const response = await fetch(`${API_URL}/uploads/thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao fazer upload da imagem');
    }

    // Return the full URL
    // API_URL is http://localhost:3001/api, we need http://localhost:3001
    const baseUrl = API_URL.replace('/api', '');
    const fullUrl = `${baseUrl}${data.data.url}`;
    
    console.log('Upload response:', data);
    console.log('Constructed URL:', fullUrl);
    
    return {
      url: fullUrl,
      filename: data.data.filename
    };
  }

  async deleteThumbnail(filename: string) {
    return this.request(`/../uploads/thumbnail/${filename}`, {
      method: 'DELETE',
    });
  }

  // Settings Management
  async getSettings() {
    return this.request('/settings');
  }

  async getSettingsByCategory(category: string) {
    return this.request(`/settings/${category}`);
  }

  async updateEmailSettings(settings: any) {
    return this.request('/settings/email', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async testEmailConfiguration(testEmail: string) {
    return this.request('/settings/email/test', {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    });
  }

  async updateGeneralSettings(settings: any) {
    return this.request('/settings/general', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updateSecuritySettings(settings: any) {
    return this.request('/settings/security', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Email Template Management
  async getEmailTemplates(): Promise<any> {
    return await this.request('/email-templates');
  }

  async getEmailTemplate(id: string): Promise<any> {
    return await this.request(`/email-templates/${id}`);
  }

  async createEmailTemplate(template: any): Promise<any> {
    return await this.request('/email-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  async updateEmailTemplate(id: string, template: any): Promise<any> {
    return await this.request(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    });
  }

  async deleteEmailTemplate(id: string): Promise<any> {
    return await this.request(`/email-templates/${id}`, {
      method: 'DELETE'
    });
  }

  async initializeEmailTemplates(): Promise<any> {
    return await this.request('/email-templates/initialize', {
      method: 'POST'
    });
  }

  // Webhook Management
  async getWebhooks(): Promise<any> {
    return await this.request('/webhooks');
  }

  async getWebhook(id: string): Promise<any> {
    return await this.request(`/webhooks/${id}`);
  }

  async createWebhook(webhook: any): Promise<any> {
    return await this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook)
    });
  }

  async updateWebhook(id: string, webhook: any): Promise<any> {
    return await this.request(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(webhook)
    });
  }

  async deleteWebhook(id: string): Promise<any> {
    return await this.request(`/webhooks/${id}`, {
      method: 'DELETE'
    });
  }

  async getWebhookEvents(id: string, params?: { status?: string; limit?: number; offset?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    return await this.request(`/webhooks/${id}/events${queryString ? `?${queryString}` : ''}`);
  }

  async testWebhook(id: string, payload?: any): Promise<any> {
    return await this.request(`/webhooks/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ payload })
    });
  }

  async retryWebhookEvents(id: string, eventIds?: string[]): Promise<any> {
    return await this.request(`/webhooks/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ eventIds })
    });
  }

  // SEO Management
  async getSeoConfigs(): Promise<any> {
    return await this.request('/seo');
  }

  async getSeoConfig(page: string): Promise<any> {
    return await this.request(`/seo/${page}`);
  }

  async upsertSeoConfig(page: string, config: any): Promise<any> {
    return await this.request(`/seo/${page}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async deleteSeoConfig(page: string): Promise<any> {
    return await this.request(`/seo/${page}`, {
      method: 'DELETE'
    });
  }

  async initializeSeoConfigs(): Promise<any> {
    return await this.request('/seo/initialize', {
      method: 'POST'
    });
  }

  async previewSeoConfig(page: string, config: any): Promise<any> {
    return await this.request(`/seo/${page}/preview`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async generateSitemap(): Promise<any> {
    return await this.request('/sitemap/generate');
  }

  // Environment Variables Management
  async getEnvConfigs(params?: { category?: string; includeValues?: boolean }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.includeValues) queryParams.append('includeValues', 'true');
    
    const queryString = queryParams.toString();
    return await this.request(`/env${queryString ? `?${queryString}` : ''}`);
  }

  async getEnvConfig(key: string): Promise<any> {
    return await this.request(`/env/${key}`);
  }

  async upsertEnvConfig(key: string, config: any): Promise<any> {
    return await this.request(`/env/${key}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async deleteEnvConfig(key: string): Promise<any> {
    return await this.request(`/env/${key}`, {
      method: 'DELETE'
    });
  }

  async initializeEnvConfigs(): Promise<any> {
    return await this.request('/env/initialize', {
      method: 'POST'
    });
  }

  async syncEnvFile(): Promise<any> {
    return await this.request('/env/sync', {
      method: 'POST'
    });
  }

  async restartApplication(): Promise<any> {
    return await this.request('/env/restart', {
      method: 'POST'
    });
  }

  async sendTestEmailTemplate(id: string, data: { testEmail: string; previewData?: any }): Promise<any> {
    return await this.request(`/email-templates/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // WordPress Template Management
  async getTemplates(params?: { status?: string; category?: string; page?: number; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    const response = await this.request(`/templates${query ? `?${query}` : ''}`);
    
    // The API returns success and data fields
    if (response?.success && response?.data) {
      return response.data;
    }
    
    return response;
  }

  async getTemplate(id: string): Promise<any> {
    return await this.request(`/templates/${id}`);
  }

  async createTemplate(templateData: FormData): Promise<any> {
    const cookieToken = Cookies.get('access_token');
    const localToken = localStorage.getItem('token');
    const token = cookieToken || localToken;

    const response = await fetch(`${API_URL}/admin/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: templateData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create template');
    }

    return data;
  }

  async updateTemplate(id: string, templateData: FormData): Promise<any> {
    const cookieToken = Cookies.get('access_token');
    const localToken = localStorage.getItem('token');
    const token = cookieToken || localToken;

    const response = await fetch(`${API_URL}/admin/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: templateData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update template');
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<any> {
    return await this.request(`/templates/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleTemplateStatus(id: string): Promise<any> {
    return await this.request(`/templates/${id}/toggle-status`, {
      method: 'PATCH'
    });
  }

  // Feature Management
  async getFeatures(params?: { status?: string; category?: string; includeDeleted?: boolean }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');
    
    const queryString = queryParams.toString();
    return await this.request(`/features${queryString ? `?${queryString}` : ''}`);
  }

  async getFeature(id: string): Promise<any> {
    return await this.request(`/features/${id}`);
  }

  async createFeature(featureData: any): Promise<any> {
    return await this.request('/features', {
      method: 'POST',
      body: JSON.stringify(featureData)
    });
  }

  async updateFeature(id: string, featureData: any): Promise<any> {
    return await this.request(`/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(featureData)
    });
  }

  async toggleFeatureStatus(id: string, reason?: string): Promise<any> {
    return await this.request(`/features/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async setFeatureMaintenanceMode(id: string, data: { maintenanceMessage?: string; estimatedTime?: string }): Promise<any> {
    return await this.request(`/features/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFeatureStatus(id: string, data: { status: string; maintenanceMessage?: string }): Promise<any> {
    return await this.request(`/features/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteFeature(id: string, confirmationCode: string, reason?: string): Promise<any> {
    return await this.request(`/features/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmationCode, reason })
    });
  }

  async restoreFeature(id: string): Promise<any> {
    return await this.request(`/features/${id}/restore`, {
      method: 'POST'
    });
  }

  async getFeatureAuditLogs(id: string, limit?: number): Promise<any> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    const queryString = queryParams.toString();
    return await this.request(`/features/${id}/audit${queryString ? `?${queryString}` : ''}`);
  }

  async bulkUpdateFeatures(featureIds: string[], action: 'enable' | 'disable' | 'delete', reason?: string): Promise<any> {
    return await this.request('/features/bulk', {
      method: 'POST',
      body: JSON.stringify({ featureIds, action, reason })
    });
  }

  async scanForFeatures(): Promise<any> {
    return await this.request('/features/scan', {
      method: 'POST'
    });
  }

  async initializeFeatures(): Promise<any> {
    return await this.request('/features/initialize', {
      method: 'POST'
    });
  }
}

export const adminService = new AdminService();