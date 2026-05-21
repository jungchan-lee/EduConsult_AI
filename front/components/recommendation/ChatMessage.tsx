'use client';

import { ChatMessage } from '@/types/recommendation';
import { Markdown } from './Markdown';

interface ChatMessageComponentProps {
  message: ChatMessage;
}

export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-4 mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold">
            AI
          </div>
        </div>
      )}

      <div
        className={`max-w-2xl px-4 py-3 rounded-lg ${
          isAssistant
            ? 'bg-gray-100 text-gray-900 border border-gray-200'
            : 'bg-blue-600 text-white'
        }`}
      >
        {isAssistant ? (
          <Markdown content={message.content} />
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-400 text-white font-bold">
            D
          </div>
        </div>
      )}
    </div>
  );
};
