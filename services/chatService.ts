// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';

export interface DBMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  created_at: string;
}

export interface UserJoin {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  joined_at: string;
}

/** Save a single chat message to the database */
export async function saveMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  language: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('chat_messages').insert({ user_id: userId, role, content, language });
}

/** Load the last N messages for a user */
export async function loadMessages(userId: string, limit = 100): Promise<DBMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Delete all chat messages for a user */
export async function clearMessages(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('chat_messages').delete().eq('user_id', userId);
}

/** Fetch all user joins (admin only) */
export async function fetchUserJoins(): Promise<UserJoin[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_joins')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Get message count per user (for admin panel) */
export async function fetchUserMessageCounts(): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('chat_messages')
    .select('user_id')
    .eq('role', 'user');
  if (!data) return {};
  return data.reduce<Record<string, number>>((acc, row) => {
    acc[row.user_id] = (acc[row.user_id] ?? 0) + 1;
    return acc;
  }, {});
}
