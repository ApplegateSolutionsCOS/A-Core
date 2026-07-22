import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SparklesIcon,
  SendIcon,
  CloseIcon,
  TrashIcon,
  GridIcon,
} from '@/components/icons/Icons';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BuildingBlock {
  id: string;
  name: string;
  type: string;
  required: boolean;
  column: 1 | 2;
  row: number;
  settings: any;
}

interface MiniAppAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentFields: BuildingBlock[];
  appName: string;
  acColor: { primary: string; rgb: string; dark: string; tw: string; colorName: string };
}

const QUICK_PROMPTS = [
  { label: 'Help me design this app', prompt: 'I need help designing this MiniApp. Can you ask me some questions to understand what I need?' },
  { label: 'Suggest field order', prompt: 'Based on my current fields, what would be the optimal order and layout for them?' },
  { label: 'Recommend a name', prompt: 'Can you suggest a good name and description for this app based on the fields I have?' },
  { label: 'What fields am I missing?', prompt: 'Looking at my current fields, what important fields might I be missing for a complete data capture solution?' },
  { label: 'Best practices', prompt: 'What are the best practices for organizing fields in a MiniApp form?' },
];

const MiniAppAIAssistant: React.FC<MiniAppAIAssistantProps> = ({
  isOpen,
  onClose,
  currentFields,
  appName,
  acColor: ac,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your MiniApp Builder Assistant. I can help you:\n\n• Choose the right BuildingBlocks for your data capture needs\n• Recommend field order and layout\n• Suggest app names and descriptions\n• Answer questions about field types and settings\n\nWhat kind of data do you need to capture?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for the AI (exclude welcome message)
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      // If only the user message exists (first real message), include the welcome context
      if (conversationHistory.length === 1) {
        conversationHistory.unshift({
          role: 'assistant',
          content: messages[0].content,
        });
      }

      const { data, error } = await supabase.functions.invoke('miniapp-ai-assistant', {
        body: {
          messages: conversationHistory,
          currentFields: currentFields.map(f => ({
            name: f.name,
            type: f.type,
            column: f.column,
            row: f.row,
            required: f.required,
          })),
          appName: appName,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data?.message || 'I apologize, I was unable to generate a response. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('[AI Assistant] Error:', err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the AI service. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat cleared! I'm ready to help you design your MiniApp. What kind of data do you need to capture?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Simple markdown-like rendering for AI responses
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];

    const flushTable = () => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div key={`table_${elements.length}`} className="my-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr>
                    {tableHeaders.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium border-b border-white/10" style={{ color: ac.primary }}>
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 text-slate-300">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table detection
      if (line.includes('|') && line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() !== '');
        // Check if next line is separator (---|---|---)
        if (!inTable && i + 1 < lines.length && lines[i + 1].includes('---')) {
          inTable = true;
          tableHeaders = cells;
          i++; // Skip separator line
          continue;
        }
        if (inTable) {
          tableRows.push(cells);
          continue;
        }
      } else if (inTable) {
        flushTable();
      }

      // Bold headers
      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={i} className="font-semibold text-white mt-2 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        );
        continue;
      }

      // Inline bold
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        elements.push(
          <p key={i} className="text-slate-300 leading-relaxed">
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="text-white font-medium">{part.replace(/\*\*/g, '')}</strong>;
              }
              return <span key={pi}>{part}</span>;
            })}
          </p>
        );
        continue;
      }

      // Bullet points
      if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2 text-slate-300 text-sm leading-relaxed">
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: ac.primary }} />
            <span>{line.trim().replace(/^[•\-]\s*/, '')}</span>
          </div>
        );
        continue;
      }

      // Numbered items
      if (/^\d+\.\s/.test(line.trim())) {
        const num = line.trim().match(/^(\d+)\./)?.[1];
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2 text-slate-300 text-sm leading-relaxed">
            <span className="text-xs font-mono mt-0.5 flex-shrink-0" style={{ color: ac.primary }}>{num}.</span>
            <span>{line.trim().replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
        continue;
      }

      // Regular text
      elements.push(
        <p key={i} className="text-slate-300 text-sm leading-relaxed">{line}</p>
      );
    }

    // Flush any remaining table
    if (inTable) flushTable();

    return elements;
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-white/10 bg-black/40 backdrop-blur-xl" style={{ width: '380px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10" style={{ background: `linear-gradient(135deg, rgba(${ac.rgb}, 0.08), transparent)` }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${ac.rgb}, 0.15)`, border: `1px solid rgba(${ac.rgb}, 0.3)` }}>
            <SparklesIcon size={18} style={{ color: ac.primary, filter: `drop-shadow(0 0 4px ${ac.primary})` }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-[10px] text-slate-500">MiniApp Builder Helper</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
            title="Clear chat"
          >
            <TrashIcon size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Context indicator */}
      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <GridIcon size={10} style={{ color: ac.primary }} />
          <span>
            {appName ? `"${appName}"` : 'Untitled App'} — {currentFields.length} field{currentFields.length !== 1 ? 's' : ''} placed
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2.5 ${
                msg.role === 'user'
                  ? 'text-sm text-white'
                  : 'text-sm bg-white/[0.04] border border-white/[0.06]'
              }`}
              style={
                msg.role === 'user'
                  ? { background: `rgba(${ac.rgb}, 0.2)`, border: `1px solid rgba(${ac.rgb}, 0.3)` }
                  : undefined
              }
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-1">{renderContent(msg.content)}</div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl px-4 py-3 bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: ac.primary, animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: ac.primary, animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: ac.primary, animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts (shown when no user messages yet) */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-medium">Quick Start</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.prompt)}
                className="px-2.5 py-1.5 text-[11px] rounded-lg border transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: `rgba(${ac.rgb}, 0.06)`,
                  borderColor: `rgba(${ac.rgb}, 0.15)`,
                  color: ac.primary,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `rgba(${ac.rgb}, 0.12)`;
                  e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.3)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `rgba(${ac.rgb}, 0.06)`;
                  e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.15)`;
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div
          className="flex items-end gap-2 rounded-xl p-2 transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about building blocks, field order, naming..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-slate-500 max-h-24"
            style={{ minHeight: '36px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 96) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30 flex-shrink-0"
            style={{
              background: input.trim() && !isLoading ? `rgba(${ac.rgb}, 0.2)` : 'transparent',
              color: ac.primary,
            }}
            onMouseEnter={e => {
              if (input.trim() && !isLoading) {
                e.currentTarget.style.background = `rgba(${ac.rgb}, 0.3)`;
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = input.trim() && !isLoading ? `rgba(${ac.rgb}, 0.2)` : 'transparent';
            }}
          >
            <SendIcon size={16} />
          </button>
        </div>
        <p className="text-[9px] text-slate-600 mt-1.5 text-center">
          AI assistant for MiniApp building only
        </p>
      </div>
    </div>
  );
};

export default MiniAppAIAssistant;
