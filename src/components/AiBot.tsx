import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { sendBotMessage, QUICK_ACTIONS, ChatMessage } from '../services/aiBotService';

let idCounter = 0;
const nextId = () => `msg-${++idCounter}-${Date.now()}`;

const AiBot: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Add welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: nextId(),
        role: 'assistant',
        content: t('ai_bot.welcome_message'),
        timestamp: new Date(),
      }]);
    }
  }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Build conversation history for context
    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await sendBotMessage(msg, history);
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: `❌ ${t('ai_bot.error')}: ${err.message || 'Something went wrong'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('openai_api_key');
    }
    setShowSettings(false);
  };

  const clearChat = () => {
    setMessages([{
      id: nextId(),
      role: 'assistant',
      content: t('ai_bot.welcome_message'),
      timestamp: new Date(),
    }]);
  };

  // Simple Markdown renderer for bold, tables, bullets, line breaks
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inTable = false;
    let key = 0;

    const renderInline = (line: string): React.ReactNode => {
      // Bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const flushTable = () => {
      if (tableHeaders.length > 0) {
        elements.push(
          <div key={key++} className="table-responsive mb-2">
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: '12px' }}>
              <thead className="table-light">
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-2 py-1">{renderInline(h.trim())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1">{renderInline(cell.trim())}</td>
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

      // Table row detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.trim().split('|').filter(Boolean);

        // Separator row (|---|---|)
        if (cells.every(c => /^[-:\s]+$/.test(c))) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      }

      // If we were in a table and now aren't, flush it
      if (inTable) flushTable();

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={key++} className="mb-1" />);
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={key++} className="my-2" />);
        continue;
      }

      // Bullet points
      if (/^\s*[•\-\*]\s/.test(line)) {
        const content = line.replace(/^\s*[•\-\*]\s/, '');
        elements.push(
          <div key={key++} className="d-flex gap-1 mb-1">
            <span>•</span>
            <span>{renderInline(content)}</span>
          </div>
        );
        continue;
      }

      // Numbered list
      if (/^\s*\d+\.\s/.test(line)) {
        const match = line.match(/^\s*(\d+)\.\s(.*)/);
        if (match) {
          elements.push(
            <div key={key++} className="d-flex gap-1 mb-1">
              <span>{match[1]}.</span>
              <span>{renderInline(match[2])}</span>
            </div>
          );
          continue;
        }
      }

      // Regular line
      elements.push(<div key={key++} className="mb-1">{renderInline(line)}</div>);
    }

    // Flush any remaining table
    if (inTable) flushTable();

    return elements;
  };

  return (
    <>
      {/* floating trigger button */}
      <button
        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          zIndex: 9999,
          transition: 'transform 0.2s',
        }}
        onClick={() => setOpen(prev => !prev)}
        title={t('ai_bot.title')}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          <i className="ti ti-x fs-20"></i>
        ) : (
          <i className="ti ti-robot fs-20"></i>
        )}
      </button>

      {/* chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: 420,
            maxWidth: 'calc(100vw - 48px)',
            height: 560,
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            animation: 'aiBotSlideUp 0.3s ease-out',
          }}
          className="bg-white border"
        >
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-primary text-white">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                <i className="ti ti-robot fs-16"></i>
              </div>
              <div>
                <h6 className="mb-0 text-white fw-bold fs-14">{t('ai_bot.title')}</h6>
                <small className="text-white-50" style={{ fontSize: 10 }}>
                  {isTyping ? t('ai_bot.thinking') : t('ai_bot.online')}
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-1">
              <button className="btn btn-sm text-white" onClick={() => setShowSettings(!showSettings)} title={t('ai_bot.settings')}>
                <i className="ti ti-settings fs-16"></i>
              </button>
              <button className="btn btn-sm text-white" onClick={clearChat} title={t('ai_bot.clear_chat')}>
                <i className="ti ti-trash fs-16"></i>
              </button>
              <button className="btn btn-sm text-white" onClick={() => setOpen(false)} title={t('common.close')}>
                <i className="ti ti-x fs-16"></i>
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-bottom p-3 bg-light">
              <label className="form-label fs-12 fw-medium">{t('ai_bot.openai_key')}</label>
              <div className="input-group input-group-sm">
                <input
                  type="password"
                  className="form-control"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleSaveApiKey}>
                  {t('common.save') || 'Save'}
                </button>
              </div>
              <small className="text-muted mt-1 d-block" style={{ fontSize: 10 }}>
                {t('ai_bot.key_hint')}
              </small>
            </div>
          )}

          {/* Messages Area */}
          <div
            className="flex-grow-1 overflow-auto p-3"
            style={{ background: '#f8f9fa' }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 me-2">
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
                      <i className="ti ti-robot text-white" style={{ fontSize: 14 }}></i>
                    </div>
                  </div>
                )}
                <div
                  className={`px-3 py-2 ${msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white border'
                    }`}
                  style={{
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    maxWidth: '85%',
                    fontSize: 13,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="d-flex mb-3 justify-content-start">
                <div className="flex-shrink-0 me-2">
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
                    <i className="ti ti-robot text-white" style={{ fontSize: 14 }}></i>
                  </div>
                </div>
                <div className="bg-white border px-3 py-2" style={{ borderRadius: '16px 16px 16px 4px' }}>
                  <div className="d-flex gap-1 align-items-center" style={{ height: 20 }}>
                    <span className="ai-bot-dot" style={{ animationDelay: '0ms' }}></span>
                    <span className="ai-bot-dot" style={{ animationDelay: '150ms' }}></span>
                    <span className="ai-bot-dot" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (show when no user messages yet) */}
          {messages.filter(m => m.role === 'user').length === 0 && !isTyping && (
            <div className="border-top px-3 py-2 bg-white">
              <small className="text-muted fw-medium d-block mb-2" style={{ fontSize: 11 }}>{t('ai_bot.quick_actions')}</small>
              <div className="d-flex flex-wrap gap-1">
                {QUICK_ACTIONS.map((qa, i) => (
                  <button
                    key={i}
                    className="btn btn-sm btn-outline-primary rounded-pill"
                    style={{ fontSize: 11, padding: '2px 10px' }}
                    onClick={() => handleSend(qa.query)}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-top p-2 bg-white">
            <div className="d-flex align-items-end gap-2">
              <textarea
                ref={inputRef}
                className="form-control border-0 bg-light"
                style={{
                  resize: 'none',
                  fontSize: 13,
                  borderRadius: 12,
                  maxHeight: 80,
                  minHeight: 38,
                }}
                rows={1}
                placeholder={t('ai_bot.placeholder')}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />
              <button
                className="btn btn-primary rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center"
                style={{ width: 38, height: 38 }}
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
              >
                <i className="ti ti-send fs-16"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes aiBotSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiBotDotPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
        .ai-bot-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #6c757d;
          display: inline-block;
          animation: aiBotDotPulse 1.2s infinite;
        }
      `}</style>
    </>
  );
};

export default AiBot;
