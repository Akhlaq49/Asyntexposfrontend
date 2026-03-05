import api from './api';

// ── Types ──

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

// ── Main chat function using backend agent API ──

export async function sendBotMessage(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
): Promise<string> {
  const res = await api.post<{ reply: string; toolsUsed?: string[] }>('/agent/chat', {
    message: userMessage,
    history: conversationHistory.slice(-20),
  });
  return res.data.reply;
}

// ── Quick actions for common queries ──

export const QUICK_ACTIONS = [
  { label: 'Dashboard Stats', query: 'Show me the dashboard overview and business stats' },
  { label: 'Due Today', query: 'What installments are due today?' },
  { label: 'Defaulters', query: 'Show me the list of defaulters' },
  { label: 'Profit & Loss', query: 'Show me the profit and loss summary' },
  { label: 'Outstanding', query: 'What is the total outstanding balance?' },
  { label: 'Customers', query: 'How many customers do we have?' },
];
