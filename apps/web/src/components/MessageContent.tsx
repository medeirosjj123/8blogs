import React from 'react';

interface MessageContentProps {
  content: string;
  className?: string;
  currentUserId?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  className = '',
  currentUserId 
}) => {
  // Parse message content for mentions and other formatting
  const parseMessageContent = (text: string) => {
    // Regex to match @mentions
    const mentionRegex = /@(\w+)/g;
    const parts: (string | { type: 'mention'; username: string; isCurrentUser: boolean })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add mention
      const username = match[1];
      parts.push({
        type: 'mention',
        username,
        isCurrentUser: username === currentUserId // You might need to map this properly
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const parsedContent = parseMessageContent(content);

  return (
    <p className={`text-slate-700 break-words ${className}`}>
      {parsedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else if (part.type === 'mention') {
          return (
            <span
              key={index}
              className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium text-sm ${
                part.isCurrentUser
                  ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
              }`}
              title={`Menção: ${part.username}`}
            >
              @{part.username}
            </span>
          );
        }
        return null;
      })}
    </p>
  );
};