// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';

export type Language = 'en' | 'am';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AIModel = 'openai/gpt-5.1' | 'x-ai/grok-3' | 'x-ai/grok-3-mini' | 'google/gemini-3-flash-preview' | 'google/gemini-3-pro-preview' | 'openai/gpt-5-mini';

export const AI_MODELS: { id: AIModel; label: string; badge: string; color: string }[] = [
  { id: 'openai/gpt-5.1',               label: 'GPT-5.1',       badge: 'OpenAI',   color: '#10a37f' },
  { id: 'x-ai/grok-3',                  label: 'Grok-3',        badge: 'xAI',      color: '#FF6B35' },
  { id: 'x-ai/grok-3-mini',             label: 'Grok-3 Mini',   badge: 'xAI',      color: '#FF8C5A' },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini Flash',  badge: 'Google',   color: '#4285F4' },
  { id: 'google/gemini-3-pro-preview',   label: 'Gemini Pro',    badge: 'Google',   color: '#0F9D58' },
  { id: 'openai/gpt-5-mini',            label: 'GPT-5 Mini',    badge: 'OpenAI',   color: '#20c997' },
];

/**
 * Calls the Digital Twin Edge Function with streaming.
 * Supports optional imageBase64 for multimodal (vision) requests.
 */
export async function streamAIResponse(
  conversationHistory: ChatMessage[],
  language: Language,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  imageBase64?: string,
  model: AIModel = 'openai/gpt-5.1'
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${backendUrl}/functions/v1/digital-twin-chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey ?? '',
        'Authorization': `Bearer ${token ?? anonKey ?? ''}`,
      },
      body: JSON.stringify({
        messages: conversationHistory,
        language,
        model,
        ...(imageBase64 ? { imageBase64 } : {}),
      }),
      signal,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI request failed: ${errText}`);
  }

  let fullText = '';
  const reader = response.body?.getReader();

  if (reader) {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const chunk = json.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch {
          // Malformed line — skip
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim() && buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const json = JSON.parse(buffer.trim().slice(6));
        const chunk = json.choices?.[0]?.delta?.content ?? '';
        if (chunk) { fullText += chunk; onChunk(chunk); }
      } catch {}
    }
  } else {
    // Fallback: full response
    const text = await response.text();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const chunk = json.choices?.[0]?.delta?.content ?? '';
        if (chunk) { fullText += chunk; onChunk(chunk); }
      } catch {}
    }
  }

  return fullText;
}

export const STARTER_MESSAGES = {
  en: "Selam, I'm your Digital Twin — powered by GPT-5.1. I can help with anything: trading, coding, writing, math, translation, or life advice. What are we building today?",
  am: "ሰላም! እኔ ዲጂታል ትዊን ነኝ — GPT-5.1 ሃይል። ንግድ፣ ኮድ፣ ጽሑፍ፣ ሒሳብ፣ ትርጉም ወይም የሕይወት ምክር — ሁሉንም እችላለሁ። ዛሬ ምን እንሠራ?",
};
