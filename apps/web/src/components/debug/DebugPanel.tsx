import React, { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { DebugConsole } from './DebugConsole';
import { debugLogger } from '../../utils/debugLogger';

export const DebugPanel: React.FC = () => {
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if debug mode is enabled
    const checkDebugMode = () => {
      const isDev = process.env.NODE_ENV === 'development';
      const hasDebugParam = window.location.search.includes('debug=true');
      const isDebugHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      setIsEnabled(isDev || hasDebugParam || isDebugHost || debugLogger.isDebugEnabled());
    };

    checkDebugMode();

    // Listen for debug panel toggle
    const handleToggle = () => {
      setIsConsoleOpen(prev => !prev);
    };

    window.addEventListener('toggleDebugPanel', handleToggle);

    // Listen for keyboard shortcut
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        handleToggle();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('toggleDebugPanel', handleToggle);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  // Don't render anything if debug is not enabled
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating debug button */}
      {!isConsoleOpen && (
        <button
          onClick={() => setIsConsoleOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Debug Console (Ctrl+Shift+D)"
        >
          <Bug className="w-5 h-5" />
        </button>
      )}

      {/* Debug Console */}
      <DebugConsole
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
      />
    </>
  );
};