import { io, Socket } from 'socket.io-client';

export interface TerminalSession {
  sessionId: string;
  socket: Socket | null;
  isConnected: boolean;
}

export interface VPSCredentials {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

class TerminalService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Connect to terminal WebSocket namespace
   */
  connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = io(`${this.apiUrl}/terminal`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Terminal WebSocket connected');
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Terminal WebSocket connection error:', error);
        reject(error);
      });

      this.setupGlobalListeners();
    });
  }

  /**
   * Setup global socket listeners
   */
  private setupGlobalListeners() {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      console.log('Terminal WebSocket disconnected');
      this.emit('disconnect');
    });

    this.socket.on('error', (error) => {
      console.error('Terminal WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Create SSH session
   */
  async createSSHSession(credentials: VPSCredentials): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/terminal/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to create SSH session');
    }

    this.sessionId = data.sessionId;
    return data.sessionId;
  }

  /**
   * Create terminal stream
   */
  createTerminal(sessionId: string): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('terminal:create', { sessionId });
  }

  /**
   * Send input to terminal
   */
  sendInput(data: string): void {
    if (!this.socket) return;
    this.socket.emit('terminal:input', data);
  }

  /**
   * Resize terminal
   */
  resizeTerminal(cols: number, rows: number): void {
    if (!this.socket) return;
    this.socket.emit('terminal:resize', { cols, rows });
  }

  /**
   * Start WordPress installation
   */
  async startInstallation(sessionId: string, templateId: string, domain: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/terminal/install`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        templateId,
        domain
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to start installation');
    }
  }

  /**
   * Test VPS connection
   */
  async testConnection(credentials: VPSCredentials): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/api/terminal/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    return data.success;
  }

  /**
   * Disconnect from VPS
   */
  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(`${this.apiUrl}/api/terminal/disconnect/${this.sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } catch (error) {
        console.error('Error disconnecting SSH session:', error);
      }
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.sessionId = null;
    this.listeners.clear();
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Also register with socket if connected
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    // Also remove from socket if connected
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Legacy methods for compatibility
  createSession(sessionId: string): Promise<TerminalSession> {
    return new Promise((resolve) => {
      resolve({
        sessionId,
        socket: this.socket,
        isConnected: this.isConnected()
      });
    });
  }

  getSession(sessionId: string): TerminalSession | undefined {
    if (this.sessionId === sessionId) {
      return {
        sessionId,
        socket: this.socket,
        isConnected: this.isConnected()
      };
    }
    return undefined;
  }

  closeSession(sessionId: string): void {
    if (this.sessionId === sessionId) {
      this.disconnect();
    }
  }

  closeAllSessions(): void {
    this.disconnect();
  }

  writeToSession(sessionId: string, data: string): boolean {
    if (this.sessionId === sessionId) {
      this.sendInput(data);
      return true;
    }
    return false;
  }

  onSessionOutput(sessionId: string, callback: (data: string) => void): void {
    if (this.sessionId === sessionId) {
      this.on('terminal:data', callback);
    }
  }

  onSessionClose(sessionId: string, callback: () => void): void {
    if (this.sessionId === sessionId) {
      this.on('terminal:close', callback);
    }
  }

  offSessionOutput(sessionId: string, callback?: (data: string) => void): void {
    if (this.sessionId === sessionId && callback) {
      this.off('terminal:data', callback);
    }
  }

  offSessionClose(sessionId: string, callback?: () => void): void {
    if (this.sessionId === sessionId && callback) {
      this.off('terminal:close', callback);
    }
  }
}

// Export singleton instance
export const terminalService = new TerminalService();
export default terminalService;