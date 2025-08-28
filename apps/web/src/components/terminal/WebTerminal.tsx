import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { io, Socket } from 'socket.io-client';
import { X, Minimize2, Maximize2, Copy, Clipboard } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface WebTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: () => void;
  className?: string;
}

export const WebTerminal: React.FC<WebTerminalProps> = ({
  isOpen,
  onClose,
  onConnect,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (isOpen && terminalRef.current && !terminal.current) {
      initializeTerminal();
    }

    return () => {
      cleanupTerminal();
    };
  }, [isOpen]);

  useEffect(() => {
    if (terminal.current && fitAddon.current) {
      const resizeHandler = () => {
        setTimeout(() => {
          fitAddon.current?.fit();
        }, 100);
      };

      window.addEventListener('resize', resizeHandler);
      return () => window.removeEventListener('resize', resizeHandler);
    }
  }, [terminal.current, fitAddon.current]);

  const initializeTerminal = () => {
    if (!terminalRef.current) return;

    // Create terminal instance
    terminal.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1a1b1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cols: 120,
      rows: 30,
    });

    // Add addons
    fitAddon.current = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(webLinksAddon);

    // Open terminal
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Initialize socket connection
    initializeSocket();

    // Welcome message
    terminal.current.writeln('\\r\\n\\x1b[1;32m╔══════════════════════════════════════════════╗\\x1b[0m');
    terminal.current.writeln('\\x1b[1;32m║         🚀 Tatame Web Terminal             ║\\x1b[0m');
    terminal.current.writeln('\\x1b[1;32m╚══════════════════════════════════════════════╝\\x1b[0m');
    terminal.current.writeln('\\r\\n\\x1b[1;33mConnecting to terminal server...\\x1b[0m\\r\\n');
  };

  const initializeSocket = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    socket.current = io(apiUrl, {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    socket.current.on('connect', () => {
      setIsConnected(true);
      terminal.current?.writeln('\\x1b[1;32m✓ Connected to terminal server\\x1b[0m\\r\\n');
      terminal.current?.writeln('\\x1b[1;37mYou can now SSH to your VPS and run the installation command.\\x1b[0m');
      terminal.current?.writeln('\\x1b[1;37mExample: ssh root@your-vps-ip\\x1b[0m\\r\\n');
      onConnect?.();
    });

    socket.current.on('disconnect', () => {
      setIsConnected(false);
      terminal.current?.writeln('\\r\\n\\x1b[1;31m✗ Disconnected from terminal server\\x1b[0m\\r\\n');
    });

    socket.current.on('terminal_output', (data: string) => {
      terminal.current?.write(data);
    });

    socket.current.on('connect_error', (error) => {
      terminal.current?.writeln(`\\r\\n\\x1b[1;31m✗ Connection error: ${error.message}\\x1b[0m\\r\\n`);
    });

    // Handle terminal input
    terminal.current?.onData((data: string) => {
      if (socket.current?.connected) {
        socket.current.emit('terminal_input', data);
      }
    });
  };

  const cleanupTerminal = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }

    if (terminal.current) {
      terminal.current.dispose();
      terminal.current = null;
    }

    fitAddon.current = null;
    setIsConnected(false);
  };

  const handleCopy = async () => {
    if (terminal.current && terminal.current.hasSelection()) {
      const selection = terminal.current.getSelection();
      if (selection) {
        try {
          await navigator.clipboard.writeText(selection);
          terminal.current.writeln('\\r\\n\\x1b[1;32m✓ Copied to clipboard\\x1b[0m');
        } catch (err) {
          terminal.current.writeln('\\r\\n\\x1b[1;31m✗ Failed to copy to clipboard\\x1b[0m');
        }
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && socket.current?.connected) {
        socket.current.emit('terminal_input', text);
      }
    } catch (err) {
      terminal.current?.writeln('\\r\\n\\x1b[1;31m✗ Failed to paste from clipboard\\x1b[0m');
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setTimeout(() => {
      fitAddon.current?.fit();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${className}`}>
      <div className={`bg-gray-900 rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-96 h-16' : 'w-full max-w-6xl h-5/6'
      }`}>
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-t-lg border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-white font-medium">
              Tatame Terminal
              {isConnected && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600 text-white">
                  Connected
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Copy selection"
            >
              <Copy className="w-4 h-4 text-gray-300" />
            </button>
            <button
              onClick={handlePaste}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Paste from clipboard"
            >
              <Clipboard className="w-4 h-4 text-gray-300" />
            </button>
            <button
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-gray-300" />
              ) : (
                <Minimize2 className="w-4 h-4 text-gray-300" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Close terminal"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        {!isMinimized && (
          <div className="h-full">
            <div 
              ref={terminalRef}
              className="w-full h-full p-4 bg-gray-900 rounded-b-lg"
              style={{ height: 'calc(100% - 60px)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};