import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('lib/game', { recursive: true });
mkdirSync('app/game/etape-[id]', { recursive: true });

writeFileSync('lib/game/locations.ts', `export const LOCATIONS = [
  { id: 1, name: 'Cathédrale', lat: 49.4403, lng: 1.0943, radius: 30 },
  { id: 2, name: 'Square Verdrel', lat: 49.4428, lng: 1.0922, radius: 30 },
  { id: 3, name: 'CHU Charles Nicolle', lat: 49.4446, lng: 1.0891, radius: 40 },
  { id: 4, name: 'Aître Saint-Maclou', lat: 49.4416, lng: 1.0968, radius: 25 },
  { id: 5, name: 'Gare Rive-Droite', lat: 49.4434, lng: 1.0889, radius: 40 },
  { id: 6, name: 'Gros-Horloge', lat: 49.4407, lng: 1.0924, radius: 25 },
  { id: 7, name: 'Place du Vieux-Marché', lat: 49.4428, lng: 1.0889, radius: 35 },
  { id: 8, name: 'Rue Beauvoisine', lat: 49.4451, lng: 1.0927, radius: 30 },
  { id: 9, name: 'Quais de Seine', lat: 49.4388, lng: 1.0924, radius: 40 },
  { id: 10, name: 'Dénouement', lat: 49.4403, lng: 1.0889, radius: 30 },
] as const;

export type Location = typeof LOCATIONS[number];
`);

writeFileSync('lib/game/gps.ts', `const R = 6371000;

export function getDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function watchPlayerPosition(
  onUpdate: (lat: number, lng: number) => void,
  onError: (err: GeolocationPositionError) => void
): number {
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate(pos.coords.latitude, pos.coords.longitude),
    onError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

export function getUnlockedStep(
  playerLat: number,
  playerLng: number,
  currentUnlocked: number[],
  locations: { id: number; lat: number; lng: number; radius: number }[]
): number | null {
  for (const loc of locations) {
    if (currentUnlocked.includes(loc.id)) continue;
    const prevId = loc.id - 1;
    if (prevId > 0 && !currentUnlocked.includes(prevId)) continue;
    const dist = getDistance(playerLat, playerLng, loc.lat, loc.lng);
    if (dist <= loc.radius) return loc.id;
  }
  return null;
}
`);

writeFileSync('lib/game/session.ts', `import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
`);

writeFileSync('app/game/page.tsx', `"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LOCATIONS } from "@/lib/game/locations";
import { watchPlayerPosition, getUnlockedStep, getDistance } from "@/lib/game/gps";
import {
  createSession, getSession, unlockStep,
  saveSessionId, loadSessionId, type GameSession,
} from "@/lib/game/session";

export default function GamePage() {
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerPos, setPlayerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playerName, setPlayerName] = useState("");

  const refreshSession = useCallback(async (id: string) => {
    const s = await getSession(id);
    if (s) setSession(s);
    return s;
  }, []);

  useEffect(() => {
    const existingId = loadSessionId();
    if (existingId) refreshSession(existingId);
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    const watchId = watchPlayerPosition(
      async (lat, lng) => {
        setPlayerPos({ lat, lng });
        const newStep = getUnlockedStep(lat, lng, session.steps_unlocked, [...LOCATIONS]);
        if (newStep) {
          await unlockStep(session.id, newStep);
          const updated = await refreshSession(session.id);
          if (updated) setSession(updated);
        }
      },
      () => setGpsError("GPS indisponible. Activez la localisation.")
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [session, refreshSession]);

  async function handleStart() {
    setStarting(true);
    const s = await createSession(playerName || undefined);
    saveSessionId(s.id);
    setSession(s);
    setStarting(false);
  }

  function getStepStatus(stepId: number) {
    if (!session) return "locked";
    if (session.steps_completed.includes(stepId)) return "done";
    if (session.steps_unlocked.includes(stepId)) return "unlocked";
    return "locked";
  }

  function getDistanceLabel(stepId: number): string {
    if (!playerPos) return "—";
    const loc = LOCATIONS.find((l) => l.id === stepId);
    if (!loc) return "—";
    const d = getDistance(playerPos.lat, playerPos.lng, loc.lat, loc.lng);
    return d < 1000 ? \`\${Math.round(d)} m\` : \`\${(d / 1000).toFixed(1)} km\`;
  }

  if (!session) {
    return (
      <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
          Les Anges Brûlés de Rouen
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24, color: "#666" }}>
          Décembre 1987. Un incendie a emporté 14 choristes. Aujourd&apos;hui,
          trois morts inexpliqués. L&apos;Inspecteur Beaumont a besoin de vous.
        </p>
        <input
          placeholder="Votre nom (optionnel)"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ width: "100%", marginBottom: 12, padding: 10, fontSize: 14 }}
        />
        <button
          onClick={handleStart}
          disabled={starting}
          style={{ width: "100%", padding: 12, fontSize: 15, cursor: "pointer" }}
        >
          {starting ? "Démarrage…" : "Commencer l'enquête"}
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Les Anges Brûlés</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {session.steps_completed.length}/10 étapes · {session.score} pts
          </div>
        </div>
        <div style={{ fontSize: 12, color: playerPos ? "green" : "#888" }}>
          {gpsError ?? (playerPos ? "GPS actif" : "Localisation…")}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LOCATIONS.map((loc) => {
          const status = getStepStatus(loc.id);
          return (
            <div
              key={loc.id}
              onClick={() => status === "unlocked" && router.push(\`/game/etape-\${loc.id}\`)}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: \`1px solid \${status === "unlocked" ? "#3b82f6" : "#e5e7eb"}\`,
                background: status === "done" ? "#f0fdf4" : "#f9fafb",
                cursor: status === "unlocked" ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: status === "locked" ? 0.45 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {status === "done" ? "✓ " : status === "locked" ? "🔒 " : "▶ "}
                  Étape {loc.id} — {loc.name}
                </div>
                {status === "unlocked" && (
                  <div style={{ fontSize: 12, color: "#3b82f6" }}>Appuyez pour démarrer</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#aaa" }}>
                {status === "locked" ? getDistanceLabel(loc.id) : ""}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
`);

writeFileSync('app/game/etape-[id]/page.tsx', `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, completeStep, loadSessionId } from "@/lib/game/session";
import { LOCATIONS } from "@/lib/game/locations";

const ANSWERS: Record<number, string> = {
  1: "BEAUVOISINE",
  2: "CHU",
  3: "SAINT-VIVIEN",
  4: "1987",
  5: "FAUVEL",
  6: "1431",
  7: "HENRI",
  8: "LECOMTE",
  9: "1431",
  10: "HENRILECOMTE",
};

export default function EtapePage() {
  const params = useParams<{ id: string }>();
  const stepId = parseInt(params.id);
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const location = LOCATIONS.find((l) => l.id === stepId);

  useEffect(() => {
    const sessionId = loadSessionId();
    if (!sessionId) { router.push("/game"); return; }
    getSession(sessionId).then((s) => {
      if (!s || !s.steps_unlocked.includes(stepId)) { router.push("/game"); return; }
      if (s.steps_completed.includes(stepId)) setDone(true);
      setLoading(false);
    });
  }, [stepId, router]);

  async function handleValidate() {
    const expected = ANSWERS[stepId];
    if (answer.trim().toUpperCase() !== expected) {
      setError("Mauvaise réponse. Cherchez encore.");
      return;
    }
    const sessionId = loadSessionId();
    if (sessionId) await completeStep(sessionId, stepId);
    setDone(true);
    setTimeout(() => router.push("/game"), 2000);
  }

  if (loading || !location) return <div style={{ padding: 20 }}>Chargement…</div>;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <button onClick={() => router.push("/game")} style={{ marginBottom: 16, fontSize: 13 }}>
        ← Carte
      </button>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Étape {stepId} / 10</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{location.name}</h1>
      </div>
      <div style={{
        background: "#f3f4f6",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        minHeight: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#888",
        fontSize: 14,
      }}>
        Scène AR — étape {stepId} (Sprint 2)
      </div>
      {!done ? (
        <>
          <input
            placeholder="Votre réponse…"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            style={{ width: "100%", marginBottom: 8, padding: 10, fontSize: 14 }}
          />
          {error && <div style={{ fontSize: 13, color: "red", marginBottom: 8 }}>{error}</div>}
          <button
            onClick={handleValidate}
            style={{ width: "100%", padding: 12, fontSize: 15, cursor: "pointer" }}
          >
            Valider
          </button>
        </>
      ) : (
        <div style={{ textAlign: "center", color: "green", fontSize: 16, padding: 20 }}>
          Étape résolue ! Retour à la carte…
        </div>
      )}
    </main>
  );
}
`);

console.log('Tous les fichiers créés !');