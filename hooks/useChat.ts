// Powered by OnSpace.AI
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/template';
import { streamAIResponse, STARTER_MESSAGES, Language, ChatMessage, AIModel } from '@/services/aiService';
import { saveMessage, loadMessages, clearMessages, DBMessage } from '@/services/chatService';

export interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  imageUri?: string;
}

function dbMsgToMessage(m: DBMessage): Message {
  return {
    id: m.id,
    text: m.content,
    role: m.role,
    timestamp: new Date(m.created_at),
    isStreaming: false,
  };
}

export function useChat() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [activeModel, setActiveModel] = useState<AIModel>('openai/gpt-5.1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  const historyRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const userId = user?.id ?? null;

  // Load conversation from DB on mount / user change
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        const rows = await loadMessages(userId!);
        if (cancelled) return;

        if (rows.length > 0) {
          const loaded = rows.map(dbMsgToMessage);
          setMessages(loaded);
          historyRef.current = rows.map((r) => ({ role: r.role, content: r.content }));
          setIsHistoryLoaded(true);
          return;
        }
      } catch {
        // Fallback to welcome
      }

      if (!cancelled) {
        const welcome: Message = {
          id: `welcome-${Date.now()}`,
          text: STARTER_MESSAGES.en,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages([welcome]);
        historyRef.current = [{ role: 'assistant', content: STARTER_MESSAGES.en }];
        try {
          await saveMessage(userId!, 'assistant', STARTER_MESSAGES.en, 'en');
        } catch {}
        setIsHistoryLoaded(true);
      }
    }

    setIsHistoryLoaded(false);
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const clearHistory = useCallback(async () => {
    if (!userId) return;
    abortRef.current?.abort();
    await clearMessages(userId);
    const welcome: Message = {
      id: `welcome-${Date.now()}`,
      text: STARTER_MESSAGES[language],
      role: 'assistant',
      timestamp: new Date(),
    };
    historyRef.current = [{ role: 'assistant', content: STARTER_MESSAGES[language] }];
    try {
      await saveMessage(userId, 'assistant', STARTER_MESSAGES[language], language);
    } catch {}
    setMessages([welcome]);
    setInputText('');
    setIsLoading(false);
  }, [userId, language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next: Language = prev === 'en' ? 'am' : 'en';
      const greeting: Message = {
        id: `lang-${Date.now()}`,
        text: STARTER_MESSAGES[next],
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((m) => [...m, greeting]);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: STARTER_MESSAGES[next] }];
      if (userId) {
        saveMessage(userId, 'assistant', STARTER_MESSAGES[next], next).catch(() => {});
      }
      return next;
    });
  }, [userId]);

  const sendMessage = useCallback(async (text: string, imageBase64?: string) => {
    if ((!text.trim() && !imageBase64) || isLoading || !userId) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const messageText = text.trim() || 'Analyze this image.';

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      role: 'user',
      timestamp: new Date(),
      imageUri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
    };

    historyRef.current = [...historyRef.current, { role: 'user', content: messageText }];
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    saveMessage(userId, 'user', messageText, language).catch(() => {});

    const streamingId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: streamingId,
      text: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      let accumulatedText = '';

      await streamAIResponse(
        historyRef.current.slice(-30),
        language,
        (chunk) => {
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, text: accumulatedText, isStreaming: true } : m
            )
          );
        },
        abortRef.current.signal,
        imageBase64,
        activeModel
      );

      const finalText = accumulatedText || 'No response. Try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId ? { ...m, text: finalText, isStreaming: false } : m
        )
      );

      historyRef.current = [...historyRef.current, { role: 'assistant', content: finalText }];
      saveMessage(userId, 'assistant', finalText, language).catch(() => {});
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errText = 'Connection issue — check your internet and try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId ? { ...m, text: errText, isStreaming: false } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, language, userId]);

  return {
    messages,
    isLoading,
    inputText,
    setInputText,
    sendMessage,
    language,
    toggleLanguage,
    clearHistory,
    isHistoryLoaded,
    activeModel,
    setActiveModel,
  };
}
