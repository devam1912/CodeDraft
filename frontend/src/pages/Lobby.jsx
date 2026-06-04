import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { roomAPI } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

/* ── Inline PlayerCard (self-contained, no import needed) ── */
function PlayerCard({ player, team }) {
  const isAlpha = team === "A";
  const glow = isAlpha ? "#6366f1" : "#22d3ee";
  const glowRgb = isAlpha ? "99,102,241" : "34,211,238";

  if (!player) {
    return (
      <div style={{
        minHeight: 90,
        border: `1px dashed rgba(${glowRgb},0.25)`,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "rgba(17,17,24,0.4)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px dashed rgba(${glowRgb},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", color: glow, fontSize: 18 }}>+</div>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>Waiting for fighter...</span>
      </div>
    );
  }

  const initials = player.avatar || (player.username?.slice(0, 2).toUpperCase() || "??");
  return (
    <div style={{
      minHeight: 90,
      background: `linear-gradient(135deg, rgba(${glowRgb},0.06), rgba(17,17,24,0.9))`,
      border: `1px solid rgba(${glowRgb},0.2)`,
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.3s",
    }}>
      <div style={{ position: "absolute", top: -20, left: -20, width: 80, height: 80, background: `radial-gradient(circle, rgba(${glowRgb},0.08), transparent)`, borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, background: "rgba(10,10,15,0.8)",
          border: `2px solid ${glow}`, color: glow,
          boxShadow: `0 0 16px rgba(${glowRgb},0.25)`,
        }}>{initials}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.01em" }}>{player.username}</span>
          {player.college ? (
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>🎓 {player.college}</span>
          ) : (
            <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic" }}>No college standing</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace" }}>ELO</span>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: `linear-gradient(135deg, ${glow}, #f8fafc)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{player.eloRating}</span>
      </div>
    </div>
  );
}

function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  const isCreator = room && (user._id === room.creatorId._id || user._id === room.creatorId);
  const maxPlayers = room ? (room.battleFormat === "2v2" ? 4 : 2) : 2;
  const canStart = players.length >= maxPlayers;
  const isTeamA = room && (teamA.some((p) => (p._id || p) === user._id) || (room.creatorId && (room.creatorId._id || room.creatorId) === user._id));
  const isTeamB = room && teamB.some((p) => (p._id || p) === user._id);
  const isParticipant = isTeamA || isTeamB;
  const myProblem = isParticipant ? (isTeamA ? room.problemA : room.problemB) : null;
  const opponentProblem = isParticipant ? (isTeamA ? room.problemB : room.problemA) : null;

  /* ─── Timer effect ─── */
  useEffect(() => {
    if (!room || !room.setupExpiresAt) return;
    const interval = setInterval(() => {
      const expiry = new Date(room.setupExpiresAt).getTime();
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        if (isCreator && canStart && room.status === "waiting_for_players") {
          handleStartBattle(true);
        }
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room, isCreator, canStart]);

  /* ─── Fetch room ─── */
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
        setPlayers(response.data.players || []);
        setTeamA(response.data.teamA || []);
        setTeamB(response.data.teamB || []);
      } catch (err) {
        toast.error(err.message || "Failed to load lobby details");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navigate]);

  /* ─── Socket listeners ─── */
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("room:join", { roomId });

    socket.on("room:playerJoined", ({ player, currentPlayers, teamA: tA, teamB: tB }) => {
      setPlayers(currentPlayers);
      if (tA) setTeamA(tA);
      if (tB) setTeamB(tB);
      if (player && player._id !== user._id) {
        toast.success(`Competitor "${player.username}" entered the lobby!`);
      }
    });

    socket.on("room:teamUpdated", ({ teamA: tA, teamB: tB, players: ps }) => {
      if (tA) setTeamA(tA);
      if (tB) setTeamB(tB);
      if (ps) setPlayers(ps);
    });

    socket.on("room:countdown", ({ count }) => {
      setCountdown(count);
    });

    socket.on("room:ready", ({ problem }) => {
      setCountdown(null);
      toast.success("Battle started! Releasing problem statement...");
      navigate(`/room/${roomId}/battle`, { state: { problem } });
    });

    socket.on("room:problemSubmitted", ({ team, problemTitle, problemDifficulty }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        const dummyProblem = { title: problemTitle, difficulty: problemDifficulty };
        if (team === "A") {
          updated.problemA = dummyProblem;
        } else {
          updated.problemB = dummyProblem;
        }
        return updated;
      });
      toast.success(`Team ${team === "A" ? "Alpha" : "Beta"} has framed their custom challenge!`);
    });

    socket.on("room:timerStarted", ({ setupExpiresAt }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, setupExpiresAt };
      });
      toast.success("All players joined! The framing clock has started!");
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      navigate("/dashboard");
    });

    return () => {
      socket.off("room:playerJoined");
      socket.off("room:teamUpdated");
      socket.off("room:countdown");
      socket.off("room:ready");
      socket.off("room:problemSubmitted");
      socket.off("room:timerStarted");
      socket.off("error");
    };
  }, [socket, room, roomId, navigate, user._id]);

  const handleStartBattle = (force = false) => {
    if (!socket || !canStart) return;
    socket.emit("room:start", { roomId, force });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.roomId);
    toast.success("Room ID copied!");
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#050508", color: "#22d3ee", fontFamily: "monospace", fontSize: 13,
      }}>
        <div style={{ animation: "pulse 2s ease-in-out infinite" }}>CONNECTING TO LOBBY...</div>
        <span style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>DECRYPTING PROTOCOLS [v3.0]</span>
      </div>
    );
  }

  if (!room) return null;

  const timerActive = !!room.setupExpiresAt;
  const timerDisplay = timerActive ? (timeLeft || "30:00") : null;
  const bothChallengesReady = !!room.problemA && !!room.problemB;

  /* ─────────────────────────────────── RENDER ─────────────────────────────────── */
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#050508", fontFamily: "Inter, sans-serif", color: "#f8fafc",
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated CSS */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes gridPan { 0%{background-position:0 0}100%{background-position:50px 50px} }
        @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.06)} }
        @keyframes timerPulse { 0%,100%{box-shadow:0 0 30px rgba(245,158,11,0.15), inset 0 0 30px rgba(245,158,11,0.05)}50%{box-shadow:0 0 50px rgba(245,158,11,0.3), inset 0 0 40px rgba(245,158,11,0.08)} }
        @keyframes scanline { 0%{top:-100%}100%{top:100%} }
        @keyframes borderGlow { 0%,100%{border-color:rgba(99,102,241,0.2)}50%{border-color:rgba(99,102,241,0.5)} }
        .timer-box-active { animation: timerPulse 2s ease-in-out infinite; }
        .orb-anim { animation: orbFloat 4s ease-in-out infinite; }
      `}</style>

      {/* Background effects */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
        backgroundSize: "48px 48px", animation: "gridPan 25s linear infinite",
      }} />
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />

      {/* Match starting countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(5,5,8,0.97)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.3em", color: "#6366f1", textTransform: "uppercase", animation: "pulse 1.5s ease-in-out infinite" }}>INITIALIZING BATTLE</span>
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  width: 160, height: 160, borderRadius: "50%", border: "3px solid #6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(17,17,24,0.9)", boxShadow: "0 0 60px rgba(99,102,241,0.4)",
                }}
              >
                <span style={{ fontSize: 72, fontWeight: 900, fontFamily: "JetBrains Mono, monospace", color: "#f8fafc", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>{countdown}</span>
              </motion.div>
              <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2em", fontFamily: "monospace" }}>Loading battle core...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", borderBottom: "1px solid rgba(30,30,46,0.6)",
        background: "rgba(17,17,24,0.5)", backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => e.target.style.color = "#22d3ee"}
            onMouseLeave={(e) => e.target.style.color = "#94a3b8"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            EXIT LOBBY
          </button>
          <div style={{ width: 1, height: 16, background: "#1e1e2e" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.5)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#22d3ee", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", textShadow: "0 0 8px rgba(34,211,238,0.4)" }}>
              LIVE LOBBY
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            textTransform: "uppercase", letterSpacing: "0.1em",
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981",
          }}>
            {players.length} / {maxPlayers} PLAYERS
          </span>
          <span style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            textTransform: "uppercase", letterSpacing: "0.1em",
            background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee",
          }}>
            {room.battleFormat} MODE
          </span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 32px 32px", position: "relative", zIndex: 1 }}>

        {/* ══════ GIANT TIMER SECTION ══════ */}
        <section style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "36px 0 28px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.25em", fontFamily: "monospace", marginBottom: 12 }}>
            CHALLENGE FRAMING COUNTDOWN
          </span>
          <div
            className={timerActive ? "timer-box-active" : ""}
            style={{
              padding: "20px 60px", borderRadius: 24,
              background: timerActive
                ? "linear-gradient(135deg, rgba(245,158,11,0.05), rgba(17,17,24,0.95))"
                : "rgba(17,17,24,0.6)",
              border: timerActive
                ? "2px solid rgba(245,158,11,0.3)"
                : "2px solid rgba(30,30,46,0.5)",
              position: "relative", overflow: "hidden",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}
          >
            {timerActive && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }} />
            )}
            <span style={{
              fontSize: 52, fontWeight: 900, fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.08em", lineHeight: 1,
              color: timerActive ? "#f59e0b" : "#22d3ee",
              textShadow: timerActive
                ? "0 0 20px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.2)"
                : "0 0 15px rgba(34,211,238,0.3)",
            }}>
              {timerActive ? timerDisplay : "AWAITING OPPONENT"}
            </span>
            <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>
              {timerActive ? "REMAINING TO FRAME CHALLENGES" : "TIMER STARTS WHEN ALL PLAYERS JOIN"}
            </span>
          </div>
        </section>

        {/* ══════ VS MATCHUP SECTION ══════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24,
          alignItems: "center", padding: "0 0 28px",
        }}>
          {/* Team Alpha */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,0.5)" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>ALPHA SQUAD</span>
              </div>
              {/* Challenge status */}
              {room.problemA ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>✅ READY</span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", animation: "pulse 2s ease-in-out infinite" }}>⏳ FRAMING</span>
              )}
            </div>
            <PlayerCard player={teamA[0] || null} team="A" />
            {room.battleFormat === "2v2" && <PlayerCard player={teamA[1] || null} team="A" />}
          </div>

          {/* Central VS Orb */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "0 12px" }}>
            <div
              className="orb-anim"
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "radial-gradient(circle, #6366f1 0%, #22d3ee 50%, transparent 100%)",
                boxShadow: "0 0 30px #6366f1, 0 0 60px rgba(34,211,238,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", inset: 3, border: "1px solid rgba(34,211,238,0.3)", borderRadius: "50%", animation: "orbFloat 6s ease-in-out infinite reverse" }} />
              <span style={{ fontSize: 16, fontWeight: 900, color: "#f8fafc", fontStyle: "italic", letterSpacing: "0.1em", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>VS</span>
            </div>
          </div>

          {/* Team Beta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px rgba(34,211,238,0.5)" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>BETA SQUAD</span>
              </div>
              {room.problemB ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>✅ READY</span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", animation: "pulse 2s ease-in-out infinite" }}>⏳ FRAMING</span>
              )}
            </div>
            <PlayerCard player={teamB[0] || null} team="B" />
            {room.battleFormat === "2v2" && <PlayerCard player={teamB[1] || null} team="B" />}
          </div>
        </section>

        {/* ══════ BOTTOM GRID: Challenge + Room ID + Actions ══════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
          flex: 1,
        }}>
          {/* Left: Challenge Framing Panel */}
          <div style={{
            background: "rgba(17,17,24,0.5)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(30,30,46,0.5)", borderRadius: 20,
            padding: 24, display: "flex", flexDirection: "column", gap: 20,
            position: "relative", overflow: "hidden",
          }}>
            {/* Top accent line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #22d3ee, transparent)", animation: "pulse 3s ease-in-out infinite" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>CUSTOM CHALLENGES</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>

            {isParticipant ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Your challenge */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>YOUR TEAM'S CHALLENGE</span>
                  {myProblem ? (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: 14, padding: "14px 18px",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>✅ SUBMITTED</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>{myProblem.title}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/room/${room.roomId}/edit`)}
                        style={{
                          padding: "8px 16px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: "rgba(26,26,36,0.8)", border: "1px solid #1e1e2e", color: "#94a3b8",
                          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.target.style.borderColor = "#22d3ee"; e.target.style.color = "#22d3ee"; }}
                        onMouseLeave={(e) => { e.target.style.borderColor = "#1e1e2e"; e.target.style.color = "#94a3b8"; }}
                      >Edit</button>
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 12,
                      background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)",
                      borderRadius: 14, padding: "16px 18px",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase" }}>⚠️ CHALLENGE PENDING</span>
                      <button
                        onClick={() => navigate(`/room/${room.roomId}/edit`)}
                        style={{
                          width: "100%", padding: "14px", borderRadius: 12, border: "none",
                          background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
                          fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em",
                          cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => e.target.style.filter = "brightness(1.15)"}
                        onMouseLeave={(e) => e.target.style.filter = "brightness(1)"}
                      >
                        📝 FRAME YOUR CHALLENGE
                      </button>
                    </div>
                  )}
                </div>

                {/* Opponent's challenge */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>OPPONENT'S CHALLENGE</span>
                  {opponentProblem ? (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: 14, padding: "14px 18px",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.5)" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>✅ CUSTOM PROBLEM READY</span>
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(17,17,24,0.6)", border: "1px solid rgba(30,30,46,0.5)",
                      borderRadius: 14, padding: "14px 18px", animation: "pulse 2s ease-in-out infinite",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#64748b" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Opponent is framing challenge...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: room.problemA ? "rgba(16,185,129,0.05)" : "rgba(17,17,24,0.5)", border: `1px solid ${room.problemA ? "rgba(16,185,129,0.2)" : "rgba(30,30,46,0.4)"}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: room.problemA ? "#10b981" : "#64748b", textTransform: "uppercase" }}>
                    {room.problemA ? `✅ Alpha Ready (${room.problemA.title})` : "⏳ Alpha framing..."}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: room.problemB ? "rgba(16,185,129,0.05)" : "rgba(17,17,24,0.5)", border: `1px solid ${room.problemB ? "rgba(16,185,129,0.2)" : "rgba(30,30,46,0.4)"}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: room.problemB ? "#10b981" : "#64748b", textTransform: "uppercase" }}>
                    {room.problemB ? `✅ Beta Ready (${room.problemB.title})` : "⏳ Beta framing..."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Room Info + Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Room Config */}
            <div style={{
              background: "rgba(17,17,24,0.5)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(30,30,46,0.5)", borderRadius: 20,
              padding: 24, display: "flex", flexDirection: "column", gap: 16,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", borderBottom: "1px solid rgba(30,30,46,0.5)", paddingBottom: 10 }}>ROOM CONFIG</span>

              {[
                ["Architect", room.creatorId?.username || "Host"],
                ["Format", `${room.battleFormat} Duel`],
                ["Difficulty", room.problem?.difficulty || "Custom"],
                ["Time Limit", `${room.problem?.timeLimit || 10} Minutes`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: "#64748b", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontWeight: 700, color: "#f8fafc" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Room ID Copy */}
            <div style={{
              background: "rgba(17,17,24,0.5)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(30,30,46,0.5)", borderRadius: 20,
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>SHARE ROOM ID</span>
              <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                Send this code to your opponent. They paste it on their dashboard to join.
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(5,5,8,0.9)", borderRadius: 14, padding: "6px 6px 6px 20px",
                border: "1px solid rgba(30,30,46,0.5)",
              }}>
                <span style={{
                  flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800,
                  color: "#22d3ee", letterSpacing: "0.2em", textTransform: "uppercase",
                  textShadow: "0 0 12px rgba(34,211,238,0.3)",
                }}>{room.roomId}</span>
                <button
                  onClick={handleCopyRoomId}
                  style={{
                    padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(30,30,46,0.5)",
                    background: "rgba(26,26,36,0.8)", color: "#f8fafc", fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#22d3ee"; e.target.style.color = "#050508"; }}
                  onMouseLeave={(e) => { e.target.style.background = "rgba(26,26,36,0.8)"; e.target.style.color = "#f8fafc"; }}
                >COPY ID</button>
              </div>
            </div>

            {/* Launch Button */}
            <div style={{ marginTop: "auto" }}>
              {isCreator ? (
                <button
                  onClick={() => handleStartBattle(false)}
                  disabled={!canStart || !bothChallengesReady}
                  style={{
                    width: "100%", padding: "18px", borderRadius: 16, border: "none",
                    fontSize: 12, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: canStart && bothChallengesReady ? "pointer" : "not-allowed",
                    transition: "all 0.3s",
                    ...(canStart && bothChallengesReady ? {
                      background: "linear-gradient(135deg, #6366f1, #818cf8, #22d3ee)",
                      color: "#f8fafc",
                      boxShadow: "0 8px 32px rgba(99,102,241,0.35), 0 0 40px rgba(99,102,241,0.15)",
                      borderTop: "1px solid rgba(255,255,255,0.15)",
                    } : {
                      background: "rgba(17,17,24,0.7)",
                      border: "1px solid rgba(30,30,46,0.5)",
                      color: "#64748b",
                    }),
                  }}
                  onMouseEnter={(e) => { if (canStart && bothChallengesReady) e.target.style.filter = "brightness(1.15)"; }}
                  onMouseLeave={(e) => e.target.style.filter = "brightness(1)"}
                >
                  {canStart
                    ? (bothChallengesReady ? "🚀 LAUNCH BATTLE" : "⏳ WAITING FOR CHALLENGES")
                    : "⏳ AWAITING OPPONENTS"}
                </button>
              ) : (
                <div style={{
                  width: "100%", padding: "18px", borderRadius: 16,
                  background: "rgba(17,17,24,0.5)", border: "1px solid rgba(30,30,46,0.4)",
                  textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                  color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  animation: "pulse 2s ease-in-out infinite",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px rgba(245,158,11,0.5)" }} />
                  WAITING FOR HOST TO LAUNCH...
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Lobby;
