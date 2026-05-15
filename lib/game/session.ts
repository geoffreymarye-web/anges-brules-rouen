import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_GAME_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GAME_SUPABASE_ANON_KEY!
  );
}

export type GameSession = {
  id: string;
  player_name: string | null;
  started_at: string;
  completed_at: string | null;
  steps_unlocked: number[];
  steps_completed: number[];
  score: number;
  hints_used: number;
};

export async function createSession(playerName?: string): Promise<GameSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ player_name: playerName ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSession(id: string): Promise<GameSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('game_sessions')
    .select()
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function unlockStep(sessionId: string, stepId: number): Promise<void> {
  const supabase = createClient();
  const session = await getSession(sessionId);
  if (!session || session.steps_unlocked.includes(stepId)) return;
  const updated = [...session.steps_unlocked, stepId];
  await supabase
    .from('game_sessions')
    .update({ steps_unlocked: updated, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function completeStep(
  sessionId: string,
  stepId: number,
  bonusPoints = 0
): Promise<void> {
  const supabase = createClient();
  const session = await getSession(sessionId);
  if (!session || session.steps_completed.includes(stepId)) return;
  const completed = [...session.steps_completed, stepId];
  const score = session.score + 10 + bonusPoints;
  const isLast = stepId === 10;
  await supabase
    .from('game_sessions')
    .update({
      steps_completed: completed,
      score,
      updated_at: new Date().toISOString(),
      ...(isLast ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', sessionId);
}

export function saveSessionId(id: string) {
  if (typeof window !== 'undefined') localStorage.setItem('game_session_id', id);
}

export function loadSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('game_session_id');
}
