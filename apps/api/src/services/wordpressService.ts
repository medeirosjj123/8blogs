import axios from 'axios';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

export interface WordPressDetectionResult {
  isWordPress: boolean;
  title?: string;
  version?: string;
  restApiEnabled: boolean;
  adminUrl?: string;
  error?: string;
}

export interface WordPressConnectionResult {
  success: boolean;
  siteInfo?: {
    title: string;
    url: string;
    adminUrl: string;
    version: string;
    plugins: Array<{ name: string; version: string; active: boolean }>;
    themes: Array<{ name: string; version: string; active: boolean }>;
  };
  error?: string;
}

export class WordPressService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly USER_AGENT = 'Tatame WordPress Connector/1.0';

  /**
   * Detect if a URL is a WordPress site
   */
  static async detectWordPressSite(url: string): Promise<WordPressDetectionResult> {
    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);
      
      logger.info(`Detecting WordPress at: ${normalizedUrl}`);

      // Try multiple detection methods
      const [htmlCheck, restApiCheck] = await Promise.allSettled([
        this.detectFromHtml(normalizedUrl),
        this.detectFromRestApi(normalizedUrl)
      ]);

      let isWordPress = false;
      let title = '';
      let version = '';
      let restApiEnabled = false;
      let adminUrl = '';

      // Check HTML detection result
      if (htmlCheck.status === 'fulfilled' && htmlCheck.value.isWordPress) {
        isWordPress = true;
        title = htmlCheck.value.title || '';
        version = htmlCheck.value.version || '';
        adminUrl = htmlCheck.value.adminUrl || '';
      }

      // Check REST API detection result
      if (restApiCheck.status === 'fulfilled' && restApiCheck.value.restApiEnabled) {
        restApiEnabled = true;
        if (!isWordPress) {
          isWordPress = true;
          title = restApiCheck.value.title || title;
          version = restApiCheck.value.version || version;
        }
      }

      return {
        isWordPress,
        title: title || 'WordPress Site',
        version: version || 'Unknown',
        restApiEnabled,
        adminUrl: adminUrl || `${normalizedUrl}/wp-admin`
      };

    } catch (error: any) {
      logger.error({ error: error.message, url }, 'WordPress detection failed');
      return {
        isWordPress: false,
        restApiEnabled: false,
        error: error.message || 'Failed to detect WordPress'
      };
    }
  }

  /**
   * Test connection to WordPress site using application password
   */
  static async testConnection(
    url: string, 
    username: string, 
    applicationPassword: string
  ): Promise<WordPressConnectionResult> {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const restApiUrl = `${normalizedUrl}/wp-json/wp/v2`;

      // Test authentication with /users/me endpoint
      const response = await axios.get(`${restApiUrl}/users/me`, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Authorization': `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`
        }
      });

      if (response.status !== 200) {
        throw new Error('Authentication failed');
      }

      // Get site information
      const [siteInfo, plugins, themes] = await Promise.allSettled([
        this.getSiteInfo(normalizedUrl, username, applicationPassword),
        this.getPlugins(normalizedUrl, username, applicationPassword),
        this.getThemes(normalizedUrl, username, applicationPassword)
      ]);

      const siteData = siteInfo.status === 'fulfilled' ? siteInfo.value : {};
      const pluginData = plugins.status === 'fulfilled' ? plugins.value : [];
      const themeData = themes.status === 'fulfilled' ? themes.value : [];

      return {
        success: true,
        siteInfo: {
          title: siteData.title || 'WordPress Site',
          url: normalizedUrl,
          adminUrl: `${normalizedUrl}/wp-admin`,
          version: siteData.version || 'Unknown',
          plugins: pluginData,
          themes: themeData
        }
      };

    } catch (error: any) {
      logger.error({ error: error.message, url, username }, 'WordPress connection test failed');
      
      let errorMessage = 'Connection failed';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid username or application password';
      } else if (error.response?.status === 403) {
        errorMessage = 'User does not have sufficient permissions';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Site not reachable or URL incorrect';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Detect WordPress from HTML content
   */
  private static async detectFromHtml(url: string): Promise<WordPressDetectionResult> {
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        headers: { 'User-Agent': this.USER_AGENT },
        maxRedirects: 5
      });

      const html = response.data;
      let isWordPress = false;
      let title = '';
      let version = '';
      let adminUrl = '';

      // Check for WordPress indicators in HTML
      const wpIndicators = [
        /wp-content/i,
        /wp-includes/i,
        /wordpress/i,
        /generator.*wordpress/i,
        /wp-json/i
      ];

      isWordPress = wpIndicators.some(pattern => pattern.test(html));

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Extract WordPress version
      const versionMatch = html.match(/generator.*wordpress\s+(\d+\.\d+(?:\.\d+)?)/i);
      if (versionMatch) {
        version = versionMatch[1];
      }

      // Check for admin URL in HTML
      const adminMatch = html.match(/href=["']([^"']*wp-admin[^"']*)/i);
      if (adminMatch) {
        adminUrl = adminMatch[1];
      }

      return {
        isWordPress,
        title,
        version,
        restApiEnabled: false, // Will be checked separately
        adminUrl
      };

    } catch (error: any) {
      throw new Error(`HTML detection failed: ${error.message}`);
    }
  }

  /**
   * Detect WordPress from REST API
   */
  private static async detectFromRestApi(url: string): Promise<WordPressDetectionResult> {
    try {
      const restApiUrl = `${url}/wp-json/wp/v2`;
      
      const response = await axios.get(restApiUrl, {
        timeout: this.TIMEOUT,
        headers: { 'User-Agent': this.USER_AGENT }
      });

      if (response.status === 200 && response.data) {
        // Get site settings to extract title
        let title = '';
        try {
          const settingsResponse = await axios.get(`${url}/wp-json/wp/v2/settings`, {
            timeout: this.TIMEOUT,
            headers: { 'User-Agent': this.USER_AGENT }
          });
          title = settingsResponse.data?.title || '';
        } catch (e) {
          // Settings endpoint might require authentication
        }

        return {
          isWordPress: true,
          title,
          version: '', // Version not available without authentication
          restApiEnabled: true
        };
      }

      throw new Error('REST API not available');

    } catch (error: any) {
      return {
        isWordPress: false,
        restApiEnabled: false
      };
    }
  }

  /**
   * Get site information
   */
  private static async getSiteInfo(url: string, username: string, password: string): Promise<any> {
    try {
      const response = await axios.get(`${url}/wp-json/wp/v2/settings`, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
      });

      return {
        title: response.data.title,
        tagline: response.data.description,
        version: response.data.wp_version || response.headers['x-wp-version']
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get installed plugins
   */
  private static async getPlugins(url: string, username: string, password: string): Promise<any[]> {
    try {
      const response = await axios.get(`${url}/wp-json/wp/v2/plugins`, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
      });

      return response.data.map((plugin: any) => ({
        name: plugin.name,
        version: plugin.version,
        active: plugin.status === 'active'
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get installed themes
   */
  private static async getThemes(url: string, username: string, password: string): Promise<any[]> {
    try {
      const response = await axios.get(`${url}/wp-json/wp/v2/themes`, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
      });

      return response.data.map((theme: any) => ({
        name: theme.name,
        version: theme.version,
        active: theme.status === 'active'
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Normalize URL to ensure it has proper protocol
   */
  private static normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url.replace(/\/$/, ''); // Remove trailing slash
  }
}