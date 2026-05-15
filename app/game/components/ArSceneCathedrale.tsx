"use client";

import { useEffect, useRef, useState } from "react";

const NEWSPAPER_LINES = [
  { text: "C'est un terrible drame qui s'est déroulé hier soir", redChars: [] },
  { text: "à Rouen lors d'un gala de bienfaiSance,", redChars: [32] },
  { text: "Quatorze choristes ont trouvé la mort dans", redChars: [0] },
  { text: "des circonstances encore mal élUcidées.", redChars: [27] },
  { text: "Les Autorités paRlent pour l'instant", redChars: [4, 16] },
  { text: "d'un accident. Rien de plus. L'enquête", redChars: [] },
  { text: "judiciairE, ouVerte dans la fouléE,", redChars: [9, 14, 32] },
  { text: "n'a pour l'heuRe Donné aucune suite", redChars: [14, 17] },
  { text: "concRète. Les famillEs des victimes", redChars: [4, 21] },
  { text: "restent sans réponse. À ce jour,", redChars: [] },
  { text: "personne ne demande de comptes. Rouen,", redChars: [] },
  { text: "choquée, sembLe déjà vouloir tourner", redChars: [12] },
  { text: "la page. En silence. Pour toujours.", redChars: [] },
  { text: "Les archives se ferment.", redChars: [] },
];

export default function ArSceneCathedrale({ onComplete }: { onComplete?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [showLetter, setShowLetter] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError(true);
      }
    }
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraReady && !cameraError) return;
    const timer = setTimeout(() => {
      setShowLetter(true);
      setParticles(Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        delay: Math.random() * 3,
      })));
      NEWSPAPER_LINES.forEach((_, i) => {
        setTimeout(() => setVisibleLines(prev => [...prev, i]), i * 200);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [cameraReady, cameraError]);

  return (
    <div style={{ position: "relative", width: "100%", height: 520, borderRadius: 12, overflow: "hidden", background: "#1a1a2e" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: cameraReady ? 1 : 0 }}
      />

      {cameraError && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1a2a4a 0%, #2a3a5a 60%, #3a2a1a 100%)" }} />
      )}

      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#d4a017",
          animation: `particleFloat 2.5s ease-in-out ${p.delay}s infinite`,
          opacity: 0,
        }} />
      ))}

      {showLetter && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(240, 235, 220, 0.95)",
          borderRadius: 6,
          padding: "14px 16px",
          width: "82%",
          maxWidth: 320,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          border: "1px solid rgba(180,140,60,0.4)",
          fontFamily: "Georgia, serif",
          maxHeight: 360,
          overflowY: "auto",
        }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, marginBottom: 2, letterSpacing: 1 }}>
            PARIS-NORMANDIE
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#666", marginBottom: 6 }}>
            Mardi 8 décembre 1987
          </div>
          <div style={{ borderTop: "1px solid #aaa", marginBottom: 8 }} />
          <div style={{ fontFamily: "Georgia, serif", fontSize: 11, lineHeight: 1.8, color: "#1a1a1a" }}>
            {NEWSPAPER_LINES.map((line, i) => (
  <span key={i} style={{
    opacity: visibleLines.includes(i) ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}>
                {line.text.split("").map((char, j) => (
                  <span key={j} style={{
                    fontWeight: line.redChars.includes(j) ? 700 : 400,
                  }}>
                    {char}
                  </span>
                ))}{" "}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#999", marginTop: 8, fontStyle: "italic", borderTop: "1px solid #ddd", paddingTop: 6 }}>
            Les majuscules, dans l'ordre de lecture…
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: "rgba(0,232,122,0.15)", border: "1px solid rgba(0,232,122,0.4)", color: "#00e87a", fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
          AR actif
        </span>
        {cameraError && <span style={{ fontSize: 11, color: "#ffaa00" }}>Caméra non disponible</span>}
      </div>

      <style>{`
        @keyframes particleFloat {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-40px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}