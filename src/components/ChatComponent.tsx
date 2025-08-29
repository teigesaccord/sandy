'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Trash2, MessageCircle } from 'lucide-react';
import type { ChatResponse, ConversationMessage } from '../types';

interface ChatComponentProps {
  userId: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function ChatComponent({ userId, className = '' }: ChatComponentProps) {
  console.log(userId)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [userId]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/chat?limit=50`);
      if (response.ok) {
        const data = await response.json();
        const historyMessages: ChatMessage[] = data.conversations.map((conv: any) => ({
          id: conv.id.toString(),
          role: conv.messageType,
          content: conv.messageText,
          timestamp: new Date(conv.timestamp)
        })).reverse(); // Reverse to show oldest first

        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Don't show error to user for history loading failure
    }
  };

  const sendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isLoading) return;

    // Clear previous error
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/users/${userId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: {
            previousMessages: messages.slice(-5), // Send last 5 messages for context
            timestamp: new Date().toISOString()
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse & { timestamp: string; error?: boolean } = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp)
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(data.suggestions || []);

      // If this was an error response, show it but don't treat as error
      if (data.error) {
        console.warn('Chat response indicates an error occurred');
      }

    } catch (error: any) {
      console.error('Chat error:', error);

      // Don't show error if request was aborted
      if (error.name === 'AbortError') {
        return;
      }

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const clearConversation = async () => {
    if (!confirm('Are you sure you want to clear the conversation history? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/chat`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessages([]);
        setSuggestions([]);
        setError(null);

        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome_new',
          role: 'assistant',
          content: "Hello! I'm Sandy, your personal support assistant. How can I help you today?",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      setError('Failed to clear conversation history.');
    }
  };

  const retryLastMessage = () => {
    // Find the last user message and resend it
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setInputMessage(lastUserMessage.content);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`flex flex-col h-[600px] bg-card rounded-lg border shadow-sm ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Chat with Sandy</h3>
            <p className="text-sm text-muted-foreground">
              {isTyping ? 'Sandy is typing...' : 'Ask me anything'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={retryLastMessage}
            className="btn btn-ghost btn-sm"
            title="Retry last message"
            disabled={messages.length === 0}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearConversation}
            className="btn btn-ghost btn-sm text-destructive hover:text-destructive"
            title="Clear conversation"
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-muted-foreground mb-4">
              Ask Sandy about goals, challenges, or anything you'd like support with.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "How can you help me?",
                "I'm feeling overwhelmed today",
                "Can you give me some recommendations?"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="btn btn-outline btn-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 message-slide-in ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-12'
                  : 'bg-muted text-muted-foreground mr-12'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              <div className={`text-xs mt-2 opacity-70 ${
                message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-3 mr-12">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Sandy is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground mb-2">Suggested responses:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="btn btn-outline btn-sm text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-destructive hover:underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-background/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              className="textarea min-h-[44px] max-h-32 resize-none pr-12"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '44px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            {inputMessage.trim() && (
              <button
                onClick={sendMessage}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary/80 disabled:opacity-50"
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{inputMessage.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
