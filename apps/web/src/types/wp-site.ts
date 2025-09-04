// WordPress Site interface - unified model
export interface WordPressSite {
  _id: string;
  userId: string;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
  isDefault: boolean;
  // Site management fields (for VPS integration)
  ipAddress?: string;
  domain?: string;
  siteType: 'managed' | 'external';
  vpsConfig?: {
    host?: string;
    port?: number;
    username?: string;
    hasAccess: boolean;
  };
  // WordPress info
  wordpressVersion?: string;
  phpVersion?: string;
  installedPlugins?: Array<{
    slug: string;
    name: string;
    version?: string;
    isActive: boolean;
  }>;
  activeTheme?: {
    slug: string;
    name: string;
    version?: string;
  };
  testConnection?: {
    lastTest?: Date;
    status: 'connected' | 'failed' | 'pending';
    error?: string;
  };
  statistics?: {
    postsPublished: number;
    lastPublishedAt?: Date;
  };
  // Legacy fields for compatibility
  status?: 'active' | 'inactive' | 'maintenance' | 'error';
  sslStatus?: 'active' | 'pending' | 'failed' | 'none';
  lastCheck?: Date;
  themes?: {
    active: string;
    total: number;
  };
  plugins?: {
    active: number;
    total: number;
    needsUpdate: number;
  };
  credentials?: {
    username: string;
    password?: string;
  };
  backups?: {
    last: Date;
    count: number;
  };
  performance?: {
    loadTime: number;
    uptime: number;
  };
  security?: {
    lastScan: Date;
    issues: number;
    firewall: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}