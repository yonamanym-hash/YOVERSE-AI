// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';

export interface BuilderProjectMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface BuilderProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  mode: string;
  messages: BuilderProjectMessage[];
  created_at: string;
  updated_at: string;
}

const supabase = () => getSupabaseClient();

export async function loadProjects(userId: string): Promise<BuilderProject[]> {
  const { data, error } = await supabase()
    .from('builder_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BuilderProject[];
}

export async function saveProject(
  userId: string,
  title: string,
  mode: string,
  messages: BuilderProjectMessage[],
  description?: string,
  existingId?: string
): Promise<BuilderProject> {
  if (existingId) {
    const { data, error } = await supabase()
      .from('builder_projects')
      .update({ title, mode, messages, description: description ?? null, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BuilderProject;
  }
  const { data, error } = await supabase()
    .from('builder_projects')
    .insert({ user_id: userId, title, mode, messages, description: description ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BuilderProject;
}

export async function renameProject(id: string, userId: string, title: string): Promise<void> {
  const { error } = await supabase()
    .from('builder_projects')
    .update({ title })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from('builder_projects')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
