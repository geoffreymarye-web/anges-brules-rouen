"use client";

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
