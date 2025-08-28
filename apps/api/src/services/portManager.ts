import mongoose from 'mongoose';
import { Installation } from '../models/Installation';

export class PortManager {
  private static readonly MIN_PORT = 8000;
  private static readonly MAX_PORT = 9999;
  
  /**
   * Get the next available port for a new WordPress installation
   */
  static async getNextAvailablePort(): Promise<number> {
    try {
      // Find the highest assigned port
      const lastInstallation = await Installation.findOne(
        { previewPort: { $exists: true } },
        { previewPort: 1 },
        { sort: { previewPort: -1 } }
      );

      let nextPort = this.MIN_PORT;
      
      if (lastInstallation?.previewPort) {
        nextPort = lastInstallation.previewPort + 1;
      }

      // Ensure we don't exceed max port
      if (nextPort > this.MAX_PORT) {
        // Find first available port by checking gaps
        const usedPorts = await Installation.distinct('previewPort', {
          previewPort: { $exists: true, $gte: this.MIN_PORT, $lte: this.MAX_PORT }
        });
        
        const sortedPorts = usedPorts.sort((a, b) => a - b);
        
        // Find first gap in sequence
        for (let i = this.MIN_PORT; i <= this.MAX_PORT; i++) {
          if (!sortedPorts.includes(i)) {
            nextPort = i;
            break;
          }
        }
        
        if (nextPort > this.MAX_PORT) {
          throw new Error('No available ports in range 8000-9999');
        }
      }

      return nextPort;
    } catch (error) {
      console.error('Error getting next available port:', error);
      throw new Error('Failed to assign port for installation');
    }
  }

  /**
   * Check if a specific port is available
   */
  static async isPortAvailable(port: number): Promise<boolean> {
    if (port < this.MIN_PORT || port > this.MAX_PORT) {
      return false;
    }

    const existingInstallation = await Installation.findOne({ previewPort: port });
    return !existingInstallation;
  }

  /**
   * Reserve a specific port for an installation
   */
  static async reservePort(installationId: string, port: number): Promise<boolean> {
    if (!(await this.isPortAvailable(port))) {
      return false;
    }

    try {
      await Installation.findByIdAndUpdate(installationId, { previewPort: port });
      return true;
    } catch (error) {
      console.error('Error reserving port:', error);
      return false;
    }
  }

  /**
   * Release a port when installation is deleted
   */
  static async releasePort(installationId: string): Promise<void> {
    try {
      await Installation.findByIdAndUpdate(installationId, { 
        $unset: { previewPort: 1 } 
      });
    } catch (error) {
      console.error('Error releasing port:', error);
    }
  }

  /**
   * Get all used ports for debugging
   */
  static async getUsedPorts(): Promise<number[]> {
    const installations = await Installation.find(
      { previewPort: { $exists: true } },
      { previewPort: 1 }
    );
    
    return installations
      .map(inst => inst.previewPort)
      .filter(port => port !== undefined)
      .sort((a, b) => a! - b!);
  }

  /**
   * Generate preview domain name
   */
  static generatePreviewDomain(userId: string, siteName?: string): string {
    const userHash = userId.slice(-6); // Last 6 characters of user ID
    const siteSlug = siteName?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'site';
    return `${userHash}-${siteSlug}.preview.tatame.com.br`;
  }
}