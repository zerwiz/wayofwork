// apps/wayofwork-ui/src/components/documenthandler/hooks/useChatMessages.ts
import { useState, useCallback } from 'react';
import { ChatMessage, Agent } from '../types/documenthandler.types';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setAgent = useCallback((agent: Agent | null) => {
    setCurrentAgent(agent);
  }, []);

  return {
    messages,
    currentAgent,
    addMessage,
    clearMessages,
    setAgent,
  };
};