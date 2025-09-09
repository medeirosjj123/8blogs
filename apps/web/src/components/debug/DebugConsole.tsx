import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Trash2, Filter, Search, ChevronDown, ChevronRight, Clock, Database, Globe, Zap } from 'lucide-react';
import { debugLogger, DebugLogEntry, ApiCallLog, LogLevel } from '../../utils/debugLogger';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [apiCalls, setApiCalls] = useState<ApiCallLog[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'api'>('logs');
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedApiCalls, setExpandedApiCalls] = useState<Set<string>>(new Set());
  
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(debugLogger.getLogs());
      setApiCalls(debugLogger.getApiCalls());
      
      if (autoScroll && logsContainerRef.current) {
        setTimeout(() => {
          logsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    };

    // Initial load
    updateLogs();

    // Listen for updates
    const handleUpdate = () => updateLogs();
    window.addEventListener('debugLogsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('debugLogsUpdated', handleUpdate);
    };
  }, [autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesCategory && matchesSearch;
  });

  const filteredApiCalls = apiCalls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(call.requestData).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const toggleApiCallExpanded = (requestId: string) => {
    const newExpanded = new Set(expandedApiCalls);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedApiCalls(newExpanded);
  };

  const getLevelColor = (level: LogLevel) => {
    const colors = {
      info: 'text-blue-600 bg-blue-50',
      success: 'text-green-600 bg-green-50',
      warning: 'text-orange-600 bg-orange-50',
      error: 'text-red-600 bg-red-50',
      debug: 'text-purple-600 bg-purple-50'
    };
    return colors[level] || colors.info;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 400) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'API': Globe,
      'DATABASE': Database,
      'WP_CONNECTION': Globe,
      'DUPLICATE_CHECK': Search,
      'SYSTEM': Zap
    };
    const Icon = icons[category] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const categories = Array.from(new Set(logs.map(log => log.category))).sort();

  const formatJson = (obj: any, maxLines: number = 10): string => {
    if (!obj) return '';
    const json = JSON.stringify(obj, null, 2);
    const lines = json.split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
    }
    return json;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-2/3 rounded-t-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Debug Console</h2>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === 'logs' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Logs ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === 'api' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                API Calls ({apiCalls.length})
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-1"
              />
              Auto-scroll
            </label>
            <button
              onClick={debugLogger.exportLogs}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Export logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={debugLogger.clearLogs}
              className="p-2 text-red-600 hover:text-red-700 transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeTab === 'logs' && (
            <>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto" ref={logsContainerRef}>
          {activeTab === 'logs' ? (
            <div className="p-4 space-y-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleLogExpanded(log.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          {expandedLogs.has(log.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {getCategoryIcon(log.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {log.category}
                            </span>
                            {log.requestId && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono">
                                {log.requestId}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-900 mb-1">{log.message}</div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp)}
                            {log.duration && ` • ${log.duration}ms`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedLogs.has(log.id) && log.data && (
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {formatJson(log.data)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredApiCalls.map((call) => (
                <div key={call.requestId} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleApiCallExpanded(call.requestId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          {expandedApiCalls.has(call.requestId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded font-medium">
                              {call.method}
                            </span>
                            {call.status && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(call.status)}`}>
                                {call.status}
                              </span>
                            )}
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono">
                              {call.requestId}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 mb-1 font-mono">{call.endpoint}</div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(call.timestamp)}
                            {call.duration && ` • ${call.duration}ms`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedApiCalls.has(call.requestId) && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-3 space-y-3">
                        {call.requestData && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Request Data:</div>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto bg-white p-2 rounded">
                              {formatJson(call.requestData)}
                            </pre>
                          </div>
                        )}
                        {call.response && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Response:</div>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto bg-white p-2 rounded">
                              {formatJson(call.response)}
                            </pre>
                          </div>
                        )}
                        {call.error && (
                          <div>
                            <div className="text-xs font-medium text-red-700 mb-1">Error:</div>
                            <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto bg-red-50 p-2 rounded">
                              {formatJson(call.error)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(activeTab === 'logs' ? filteredLogs : filteredApiCalls).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No {activeTab} found {searchTerm && `matching "${searchTerm}"`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-600">
          <div className="flex justify-between items-center">
            <span>
              Press Ctrl+Shift+D to toggle this panel • 
              Total: {logs.length} logs, {apiCalls.length} API calls
            </span>
            <span>
              {filteredLogs.length} / {logs.length} logs shown
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};