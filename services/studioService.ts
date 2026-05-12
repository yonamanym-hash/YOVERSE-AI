// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Sends a photo (base64) to the Digital Twin edge function for AI style/editing/pose analysis.
 */
export async function analyzePhotoWithAI(
  base64Image: string,
  userPrompt: string
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('digital-twin-chat', {
    body: {
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      language: 'en',
      imageBase64: base64Image,
      mode: 'studio',
    },
  });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const textContent = await error.context?.text();
        errorMessage = textContent || error.message;
      } catch {
        errorMessage = error.message;
      }
    }
    throw new Error(errorMessage);
  }

  return data?.content ?? 'No feedback received.';
}
