"use client";

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
    return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
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

        <div style={{ fontSize: 12, color: playerPos ? "green" : "#888" }}>
          {gpsError ?? (playerPos ? "GPS actif" : "Localisation…")}
        </div>
      </div>

      {/* BOUTON DEV - à supprimer en prod */}
      <button onClick={async () => {
        if (!session) return;
        await unlockStep(session.id, 1);
        const s = await refreshSession(session.id);
        if (s) setSession(s);
      }} style={{ fontSize: 12, marginBottom: 16 }}>
        [DEV] Débloquer étape 1
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              onClick={() => status === "unlocked" && router.push(`/game/etape-${loc.id}`)}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${status === "unlocked" ? "#3b82f6" : "#e5e7eb"}`,
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
