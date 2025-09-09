import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug';

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  requestId?: string;
  duration?: number;
}

export interface ApiCallLog {
  requestId: string;
  endpoint: string;
  method: string;
  requestData: any;
  response?: any;
  error?: any;
  status?: number;
  duration?: number;
  timestamp: Date;
}

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private apiCalls: ApiCallLog[] = [];
  private maxLogs = 100;
  private isEnabled = process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true');

  constructor() {
    // Load existing logs from sessionStorage
    this.loadFromStorage();
    
    // Listen for debug toggle
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        this.toggleDebugPanel();
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToStorage(): void {
    if (!this.isEnabled) return;
    
    try {
      sessionStorage.setItem('tatame_debug_logs', JSON.stringify(this.logs.slice(-50)));
      sessionStorage.setItem('tatame_debug_api_calls', JSON.stringify(this.apiCalls.slice(-50)));
    } catch (error) {
      console.warn('Failed to save debug logs to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (!this.isEnabled) return;
    
    try {
      const logs = sessionStorage.getItem('tatame_debug_logs');
      const apiCalls = sessionStorage.getItem('tatame_debug_api_calls');
      
      if (logs) {
        this.logs = JSON.parse(logs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
      
      if (apiCalls) {
        this.apiCalls = JSON.parse(apiCalls).map((call: any) => ({
          ...call,
          timestamp: new Date(call.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load debug logs from storage:', error);
    }
  }

  log(level: LogLevel, category: string, message: string, data?: any, requestId?: string, duration?: number): void {
    if (!this.isEnabled) return;

    const entry: DebugLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to avoid mutations
      requestId,
      duration
    };

    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging with colors
    const style = this.getConsoleStyle(level);
    const prefix = `[${category}]`;
    
    if (data) {
      console.log(`%c${prefix} ${message}`, style, data);
    } else {
      console.log(`%c${prefix} ${message}`, style);
    }

    this.saveToStorage();
    this.notifyDebugPanel();
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      info: 'color: #2563eb; font-weight: bold;',
      success: 'color: #16a34a; font-weight: bold;',
      warning: 'color: #ea580c; font-weight: bold;',
      error: 'color: #dc2626; font-weight: bold;',
      debug: 'color: #7c3aed; font-weight: bold;'
    };
    return styles[level] || styles.info;
  }

  // Convenience methods
  info(category: string, message: string, data?: any, requestId?: string): void {
    this.log('info', category, message, data, requestId);
  }

  success(category: string, message: string, data?: any, requestId?: string): void {
    this.log('success', category, message, data, requestId);
  }

  warning(category: string, message: string, data?: any, requestId?: string): void {
    this.log('warning', category, message, data, requestId);
  }

  error(category: string, message: string, data?: any, requestId?: string): void {
    this.log('error', category, message, data, requestId);
  }

  debug(category: string, message: string, data?: any, requestId?: string): void {
    this.log('debug', category, message, data, requestId);
  }

  // API call logging
  logApiCall(endpoint: string, method: string, requestData: any): string {
    const requestId = this.generateRequestId();
    const apiCall: ApiCallLog = {
      requestId,
      endpoint,
      method: method.toUpperCase(),
      requestData: requestData ? JSON.parse(JSON.stringify(requestData)) : undefined,
      timestamp: new Date()
    };

    this.apiCalls.push(apiCall);
    
    // Keep only last 50 API calls
    if (this.apiCalls.length > 50) {
      this.apiCalls = this.apiCalls.slice(-50);
    }

    this.info('API', `${method.toUpperCase()} ${endpoint}`, {
      requestId,
      data: requestData
    }, requestId);

    return requestId;
  }

  logApiResponse(requestId: string, response: any, status: number, duration: number): void {
    const apiCall = this.apiCalls.find(call => call.requestId === requestId);
    if (apiCall) {
      apiCall.response = response ? JSON.parse(JSON.stringify(response)) : undefined;
      apiCall.status = status;
      apiCall.duration = duration;
    }

    const level = status >= 400 ? 'error' : status >= 200 ? 'success' : 'info';
    this.log(level, 'API', `Response ${status} (${duration}ms)`, {
      requestId,
      status,
      response,
      duration
    }, requestId, duration);

    this.saveToStorage();
    this.notifyDebugPanel();
  }

  logApiError(requestId: string, error: any, duration?: number): void {
    const apiCall = this.apiCalls.find(call => call.requestId === requestId);
    if (apiCall) {
      apiCall.error = error ? JSON.parse(JSON.stringify(error)) : undefined;
      apiCall.status = error?.response?.status || 0;
      apiCall.duration = duration;
    }

    this.error('API', `Request failed (${duration || 0}ms)`, {
      requestId,
      error: error?.message || error,
      status: error?.response?.status,
      response: error?.response?.data
    }, requestId);

    this.saveToStorage();
    this.notifyDebugPanel();
  }

  // Duplicate detection logging
  logDuplicateCheck(url: string, userId: string, results: any, requestId?: string): void {
    this.info('DUPLICATE_CHECK', `Checking duplicates for: ${url}`, {
      url,
      userId,
      results,
      requestId
    }, requestId);
  }

  // Database query logging
  logDatabaseQuery(model: string, operation: string, query: any, results: any, requestId?: string): void {
    this.debug('DATABASE', `${model}.${operation}`, {
      model,
      operation,
      query,
      results: Array.isArray(results) ? `${results.length} records` : results,
      requestId
    }, requestId);
  }

  // WordPress connection logging
  logWordPressConnection(url: string, status: 'testing' | 'success' | 'failed', details?: any, requestId?: string): void {
    const level = status === 'success' ? 'success' : status === 'failed' ? 'error' : 'info';
    this.log(level, 'WP_CONNECTION', `WordPress connection ${status}: ${url}`, details, requestId);
  }

  // Get logs for display
  getLogs(): DebugLogEntry[] {
    return [...this.logs].reverse(); // Most recent first
  }

  getApiCalls(): ApiCallLog[] {
    return [...this.apiCalls].reverse(); // Most recent first
  }

  // Filter methods
  getLogsByCategory(category: string): DebugLogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByRequestId(requestId: string): DebugLogEntry[] {
    return this.logs.filter(log => log.requestId === requestId);
  }

  getLogsByLevel(level: LogLevel): DebugLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Clear methods
  clearLogs(): void {
    this.logs = [];
    this.apiCalls = [];
    sessionStorage.removeItem('tatame_debug_logs');
    sessionStorage.removeItem('tatame_debug_api_calls');
    this.info('SYSTEM', 'Debug logs cleared');
    this.notifyDebugPanel();
  }

  // Export functionality
  exportLogs(): void {
    const exportData = {
      logs: this.logs,
      apiCalls: this.apiCalls,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tatame-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.success('SYSTEM', 'Debug logs exported');
  }

  // Debug panel management
  private notifyDebugPanel(): void {
    // Dispatch event for debug panel to update
    window.dispatchEvent(new CustomEvent('debugLogsUpdated', {
      detail: { logs: this.getLogs(), apiCalls: this.getApiCalls() }
    }));
  }

  toggleDebugPanel(): void {
    window.dispatchEvent(new CustomEvent('toggleDebugPanel'));
    this.info('SYSTEM', 'Debug panel toggled');
  }

  // Enable/disable debugging
  enable(): void {
    this.isEnabled = true;
    this.info('SYSTEM', 'Debug logging enabled');
  }

  disable(): void {
    this.isEnabled = false;
    console.log('Debug logging disabled');
  }

  isDebugEnabled(): boolean {
    return this.isEnabled;
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Global access for console debugging
if (typeof window !== 'undefined') {
  (window as any).tatameDebug = debugLogger;
}