import api from './api';

export interface VPSCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  authMethod: 'password' | 'privateKey';
}

export interface VPSConfiguration {
  _id: string;
  host: string;
  port: number;
  username: string;
  isConfigured: boolean;
  configuredAt?: string;
  resetAt?: string;
  lastCheckedAt?: string;
  wordOpsVersion?: string;
  features: {
    hasWordOps: boolean;
    hasNginx: boolean;
    hasMySQL: boolean;
    hasPHP: boolean;
    hasSSL: boolean;
    hasFirewall: boolean;
    hasRedis: boolean;
  };
  totalSites: number;
  createdAt: string;
}

export interface VPSStatus {
  isOnline: boolean;
  hasWordOps: boolean;
  hasNginx: boolean;
  hasMySQL: boolean;
  hasPHP: boolean;
  wordOpsVersion?: string;
  osInfo?: string;
}

export interface VPSSetupResponse {
  success: boolean;
  message: string;
  vpsId?: string;
}

class VPSService {
  /**
   * Get all VPS configurations for the authenticated user
   */
  async getVPSConfigurations(): Promise<VPSConfiguration[]> {
    const response = await api.get('/api/vps/configurations');
    return response.data.vpsList || [];
  }

  /**
   * Test VPS connection and compatibility
   */
  async testVPSConnection(credentials: VPSCredentials): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await api.post('/api/vps/test-connection', credentials);
    return response.data;
  }

  /**
   * Check real-time VPS status by connecting to it
   */
  async checkVPSStatus(credentials: VPSCredentials): Promise<{
    success: boolean;
    status?: VPSStatus;
    message?: string;
  }> {
    const response = await api.post('/api/vps/check-status', credentials);
    return response.data;
  }

  /**
   * Get VPS status from database by host
   */
  async getVPSStatusByHost(host: string): Promise<{
    success: boolean;
    vps?: VPSConfiguration;
    message?: string;
  }> {
    const response = await api.get(`/api/vps/status/${host}`);
    return response.data;
  }

  /**
   * Save VPS configuration to database
   */
  async saveVPSConfiguration(config: {
    host: string;
    port: number;
    username: string;
    authMethod: string;
  }): Promise<{
    success: boolean;
    message: string;
    vps?: VPSConfiguration;
  }> {
    const response = await api.post('/api/vps/configurations', config);
    return response.data;
  }

  /**
   * Setup VPS with complete reset and WordOps installation
   */
  async setupVPS(setupData: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    authMethod: 'password' | 'privateKey';
    userEmail: string;
  }): Promise<VPSSetupResponse> {
    const response = await api.post('/api/vps/setup', setupData);
    return response.data;
  }

  /**
   * Check if domain already exists on any VPS
   */
  async checkDomainExists(domain: string): Promise<{
    success: boolean;
    exists: boolean;
    vps?: {
      host: string;
      configuredAt: string;
    };
  }> {
    const response = await api.get(`/api/vps/check-domain/${domain}`);
    return response.data;
  }

  /**
   * Delete VPS configuration
   */
  async deleteVPSConfiguration(vpsId: string): Promise<{
    success: boolean;
    message: string;
    activeSites?: string[];
  }> {
    const response = await api.delete(`/api/vps/configurations/${vpsId}`);
    return response.data;
  }

  /**
   * Check if user has any configured VPS
   */
  async hasConfiguredVPS(): Promise<boolean> {
    try {
      const configurations = await this.getVPSConfigurations();
      return configurations.some(vps => vps.isConfigured);
    } catch (error) {
      console.error('Error checking VPS configurations:', error);
      return false;
    }
  }

  /**
   * Get the first configured VPS (for single VPS users)
   */
  async getConfiguredVPS(): Promise<VPSConfiguration | null> {
    try {
      const configurations = await this.getVPSConfigurations();
      return configurations.find(vps => vps.isConfigured) || null;
    } catch (error) {
      console.error('Error getting configured VPS:', error);
      return null;
    }
  }
}

export const vpsService = new VPSService();
export default vpsService;