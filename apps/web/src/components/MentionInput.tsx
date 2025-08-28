import React, { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { useMentionUsers, type MentionUser } from '../hooks/useMentionUsers';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onMentionSelect?: (mentions: string[]) => void;
  onInput?: () => void;
  placeholder?: string;
  className?: string;
  channelId?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onKeyPress,
  onMentionSelect,
  onInput,
  placeholder,
  className,
  channelId
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const [currentMention, setCurrentMention] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch real users from API
  const { data: users = [], isLoading: usersLoading } = useMentionUsers();

  // Extract mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  // Handle input changes and detect mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Call onInput callback for typing indicators
    if (onInput) {
      onInput();
    }
    
    // Check if we're typing a mention
    const beforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.substring(lastAtIndex + 1);
      
      // Check if it's a valid mention context (no spaces after @)
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setMentionStart(lastAtIndex);
        setCurrentMention(afterAt);
        
        // Filter users based on current mention
        const filtered = users.filter(user => 
          user.name.toLowerCase().includes(afterAt.toLowerCase())
        );
        
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    // Extract and notify about mentions
    const mentions = extractMentions(newValue);
    if (onMentionSelect && mentions.length > 0) {
      onMentionSelect(mentions);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Tab':
        case 'Enter':
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            selectMention(suggestions[selectedIndex]);
            return; // Don't trigger parent onKeyPress
          } else if (e.key === 'Tab') {
            e.preventDefault();
            selectMention(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    }
    
    // Only call parent onKeyPress if we didn't handle the event
    if (e.key === 'Enter' && !showSuggestions) {
      onKeyPress(e);
    }
  };

  // Select a mention from suggestions
  const selectMention = (user: MentionUser) => {
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(mentionStart + currentMention.length + 1);
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStart + user.name.length + 2; // +2 for @ and space
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Render mentions in the text with highlights
  const renderTextWithMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, index) => {
      // Every odd index is a mention (captured group)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-blue-600 font-semibold">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      
      {/* Mention Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
            Mencionar usuário
          </div>
          {usersLoading ? (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              Carregando usuários...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              Nenhum usuário encontrado
            </div>
          ) : (
            suggestions.map((user, index) => (
              <button
                key={user.id}
                onClick={() => selectMention(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span>{user.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">@{user.name}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};