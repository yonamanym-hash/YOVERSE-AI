// Powered by OnSpace.AI — Voice Service
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { getSupabaseClient } from '@/template';

let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;
  } catch (err) {
    throw new Error('Could not start recording: ' + String(err));
  }
}

export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recording.getURI();
    recording = null;

    if (!uri) return null;

    // Read the file and convert to base64
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    recording = null;
    return null;
  }
}

export async function cancelRecording(): Promise<void> {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {}
  recording = null;
}

/**
 * Transcribes audio using OnSpace AI (Gemini multimodal audio → text)
 */
export async function transcribeAudio(audioBase64: string, language: 'en' | 'am'): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${backendUrl}/functions/v1/digital-twin-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey ?? '',
      'Authorization': `Bearer ${token ?? anonKey ?? ''}`,
    },
    body: JSON.stringify({
      mode: 'transcribe',
      audioBase64,
      language,
      messages: [],
    }),
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  const data = await response.json();
  return data.transcript ?? '';
}

// ── Text-to-Speech ──────────────────────────────────────────────────────────

let isSpeaking = false;

export function speakText(text: string, language: 'en' | 'am', onDone?: () => void): void {
  Speech.stop();

  // Strip markdown for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/#{1,3}\s+/g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\d+[.)]\s+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();

  // Limit to first 500 chars for long responses
  const capped = clean.length > 500 ? clean.slice(0, 500) + '...' : clean;

  isSpeaking = true;
  Speech.speak(capped, {
    language: language === 'am' ? 'am-ET' : 'en-US',
    rate: 0.95,
    pitch: 1.0,
    onDone: () => {
      isSpeaking = false;
      onDone?.();
    },
    onStopped: () => { isSpeaking = false; },
    onError: () => { isSpeaking = false; },
  });
}

export function stopSpeaking(): void {
  Speech.stop();
  isSpeaking = false;
}

export function getIsSpeaking(): boolean {
  return isSpeaking;
}
