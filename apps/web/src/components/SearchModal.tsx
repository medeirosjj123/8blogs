import React, { useState, useEffect, useRef } from 'react';
import { X, Search as SearchIcon, Loader2, FileText } from 'lucide-react';
import chatService from '../services/chat.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
  onSelectMessage?: (channelId: string) => void;
}

interface SearchResult {
  id: string;
  channelId: string;
  userId: any;
  content: string;
  type: string;
  createdAt: string;
  score?: number;
}

export const SearchModal: React.FC<SearchModalProps> = ({ 
  isOpen, 
  onClose, 
  channelId,
  onSelectMessage 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 500);
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const searchResults = await chatService.searchMessages(query, channelId);
      setResults(searchResults as any);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro ao buscar mensagens');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onSelectMessage) {
      onSelectMessage(result.channelId);
    }
    onClose();
  };

  const highlightQuery = (text: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200 text-slate-900">{part}</mark>
        : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-200">
          <SearchIcon className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={channelId ? "Buscar neste canal..." : "Buscar em todas as mensagens..."}
            className="flex-1 text-lg outline-none placeholder-slate-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-coral mb-4" />
              <p className="text-slate-600">Buscando mensagens...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {result.userId?.name ? result.userId.name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {result.userId?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(result.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 break-words">
                        {highlightQuery(result.content)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : hasSearched && query.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">Nenhuma mensagem encontrada</p>
              <p className="text-sm text-slate-400 mt-1">
                Tente buscar com outras palavras
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <SearchIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">Digite para buscar</p>
              <p className="text-sm text-slate-400 mt-1">
                Mínimo de 2 caracteres
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600 text-center">
              {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};