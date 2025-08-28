export interface WordPressTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  demoUrl: string;
  thumbnailUrl: string;
  downloadUrl: string;
  features: string[];
  seoScore: number;
  performanceScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface InstallationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface InstallationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  logs: string[];
  startedAt?: Date;
  completedAt?: Date;
}