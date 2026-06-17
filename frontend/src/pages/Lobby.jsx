import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { roomAPI, userAPI } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

/* â”€â”€ Inline PlayerCard (self-contained, no import needed) â”€â”€ */
function PlayerCard({ player, team, selectedLanguage, isMe, onChangeLanguage, glow, glowRgb }) {

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
        <span style={{ fontSize: 11, color: "#7a6b94", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>Waiting for fighter...</span>
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
          fontSize: 20, fontWeight: 800, background: "rgba(13,8,24,0.8)",
          border: `2px solid ${glow}`, color: glow,
          boxShadow: `0 0 16px rgba(${glowRgb},0.25)`,
        }}>{initials}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#eee8f5", letterSpacing: "-0.01em" }}>{player.username}</span>
          {player.college ? (
            <span style={{ fontSize: 10, color: "#a99bc2", fontWeight: 600 }}>ðŸŽ“ {player.college}</span>
          ) : (
            <span style={{ fontSize: 10, color: "#7a6b94", fontStyle: "italic" }}>No college standing</span>
          )}
          
          {isMe ? (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#7a6b94", textTransform: "uppercase" }}>Coding In:</span>
              <select
                value={selectedLanguage || "javascript"}
                onChange={(e) => onChangeLanguage(e.target.value)}
                style={{
                  backgroundColor: "#120b22",
                  border: "1px solid rgba(126,93,189,0.15)",
                  borderRadius: 6,
                  color: "#d4a053",
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "2px 4px",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="c">C</option>
              </select>
            </div>
          ) : (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#7a6b94", textTransform: "uppercase" }}>Coding In:</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#d4a053", background: "rgba(212,160,83,0.1)", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                {selectedLanguage || "Selecting..."}
              </span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 9, color: "#7a6b94", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace" }}>ELO</span>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: `linear-gradient(135deg, ${glow}, #eee8f5)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{player.eloRating}</span>
      </div>
    </div>
  );
}

function ChallengeFramingCard({ teamLabel, isMyTeam, problem, roomId, color, rgb }) {
  const navigate = useNavigate();

  return (
    <div style={{
      background: "rgba(17,17,24,0.5)",
      backdropFilter: "blur(12px)",
      border: `1px solid rgba(${rgb}, 0.25)`,
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      marginTop: 8,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#7a6b94", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          {isMyTeam ? "YOUR TEAM'S CHALLENGE" : `${teamLabel}'S CHALLENGE`}
        </span>
      </div>

      {isMyTeam ? (
        problem ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(93,184,133,0.05)", border: "1px solid rgba(93,184,133,0.15)",
            borderRadius: 12, padding: "10px 14px",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#5db885", letterSpacing: "0.08em" }}>âœ… READY</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#eee8f5" }}>{problem.title}</span>
            </div>
            <button
              onClick={() => navigate(`/room/${roomId}/edit`)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 9, fontWeight: 700,
                background: "rgba(26,26,36,0.8)", border: "1px solid #2a1845", color: "#a99bc2",
                cursor: "pointer", textTransform: "uppercase",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = color; e.target.style.color = color; }}
              onMouseLeave={(e) => { e.target.style.borderColor = "#2a1845"; e.target.style.color = "#a99bc2"; }}
            >Edit</button>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            background: `rgba(${rgb}, 0.04)`, border: `1px solid rgba(${rgb}, 0.15)`,
            borderRadius: 12, padding: "12px 14px",
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#d4a053" }}>âš ï¸ PENDING</span>
            <button
              onClick={() => navigate(`/room/${roomId}/edit`)}
              style={{
                width: "100%", padding: "10px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${color}, #9478cc)`, color: "#fff",
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                cursor: "pointer", boxShadow: `0 4px 12px rgba(${rgb}, 0.2)`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.filter = "brightness(1.15)"}
              onMouseLeave={(e) => e.target.style.filter = "brightness(1)"}
            >
              ðŸ“ FRAME CHALLENGE
            </button>
          </div>
        )
      ) : (
        problem ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(93,184,133,0.05)", border: "1px solid rgba(93,184,133,0.15)",
            borderRadius: 12, padding: "10px 14px",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5db885" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#5db885", textTransform: "uppercase" }}>âœ… CUSTOM CHALLENGE READY</span>
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(17,17,24,0.6)", border: "1px solid rgba(30,30,46,0.4)",
            borderRadius: 12, padding: "10px 14px",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a6b94", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "#7a6b94", textTransform: "uppercase" }}>Opponent is framing...</span>
          </div>
        )
      )}
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

  const [friends, setFriends] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const isCreator = room && user && (user._id === (room.creatorId?._id || room.creatorId));
  const maxPlayers = room ? (room.battleFormat === "2v2" ? 4 : 2) : 2;
  const canStart = players.length >= maxPlayers;
  const isTeamA = room && user && teamA.some((p) => (p._id || p) === user._id);
  const isTeamB = room && user && teamB.some((p) => (p._id || p) === user._id);
  const isParticipant = isTeamA || isTeamB;
  const myProblem = isParticipant ? (isTeamA ? room.problemA : room.problemB) : null;
  const opponentProblem = isParticipant ? (isTeamA ? room.problemB : room.problemA) : null;

  // Colors configuration based on user's team
  const myTeamColor = "#7e5dbd";
  const myTeamRgb = "99,102,241";
  const opponentTeamColor = "#c75c4a";
  const opponentTeamRgb = "239,68,68";

  // Symmetrical check: Team A is styled blue for Team A members or spectators
  const teamAIsMe = isTeamA || (!isTeamA && !isTeamB);
  
  const teamAColor = teamAIsMe ? myTeamColor : opponentTeamColor;
  const teamARgb = teamAIsMe ? myTeamRgb : opponentTeamRgb;
  const teamBColor = teamAIsMe ? opponentTeamColor : myTeamColor;
  const teamBRgb = teamAIsMe ? opponentTeamRgb : myTeamRgb;

  const roomLoaded = !!room;

  /* â”€â”€â”€ Timer effect â”€â”€â”€ */
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

  /* â”€â”€â”€ Fetch room â”€â”€â”€ */
  useEffect(() => {
    if (!user) return;
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
        setPlayers(response.data.players || []);
        setTeamA(response.data.teamA || []);
        setTeamB(response.data.teamB || []);

        const myLang = response.data.playerLanguages?.[user._id];
        if (!myLang) {
          setShowLanguageModal(true);
        }
      } catch (err) {
        toast.error(err.message || "Failed to load lobby details");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navigate, user?._id]);

  /* â”€â”€â”€ Socket listeners â”€â”€â”€ */
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("room:join", { roomId });

    socket.on("room:playerJoined", ({ player, currentPlayers, teamA: tA, teamB: tB }) => {
      setPlayers(currentPlayers);
      if (tA) setTeamA(tA);
      if (tB) setTeamB(tB);
      if (player && player._id !== user?._id) {
        toast.success(`Competitor "${player.username}" entered the lobby!`);
        setShowInviteModal(false);
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

    socket.on("room:languageUpdated", ({ userId: uId, language, playerLanguages }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, playerLanguages };
      });
      if (uId !== user?._id) {
        toast(`Opponent changed their language to ${language.toUpperCase()}!`, { icon: "âš™ï¸" });
      }
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
      socket.off("room:languageUpdated");
      socket.off("error");
    };
  }, [socket, roomLoaded, roomId, navigate, user?._id]);

  const handleStartBattle = (force = false) => {
    if (!socket || !canStart) return;
    socket.emit("room:start", { roomId, force });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.roomId);
    toast.success("Room ID copied!");
  };

  const handleSelectLanguage = (lang) => {
    if (!socket) return;
    socket.emit("room:selectLanguage", { roomId, language: lang });
    setRoom((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (!updated.playerLanguages) updated.playerLanguages = {};
      if (user) updated.playerLanguages[user._id] = lang;
      return updated;
    });
  };

  const loadFriendsList = async () => {
    setFriendsLoading(true);
    try {
      const res = await userAPI.getFriends();
      setFriends(res.data?.friends || []);
    } catch (err) {
      toast.error("Failed to load friends list");
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleInviteFriend = async (friendUsername) => {
    setInvitingFriend(friendUsername);
    try {
      await userAPI.inviteFriendToBattle(friendUsername, { roomId, battleFormat: room.battleFormat });
      toast.success(`Battle invite sent to ${friendUsername}!`);
    } catch (err) {
      toast.error(err.message || "Failed to send invite");
    } finally {
      setInvitingFriend(null);
    }
  };

  /* â”€â”€â”€ Loading â”€â”€â”€ */
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#050508", color: "#d4a053", fontFamily: "monospace", fontSize: 13,
      }}>
        <div style={{ animation: "pulse 2s ease-in-out infinite" }}>CONNECTING TO LOBBY...</div>
        <span style={{ fontSize: 10, color: "#7a6b94", marginTop: 8 }}>DECRYPTING PROTOCOLS [v3.0]</span>
      </div>
    );
  }

  if (!room) return null;

  const timerActive = !!room.setupExpiresAt;
  const timerDisplay = timerActive ? (timeLeft || "30:00") : null;
  const bothChallengesReady = !!room.problemA && !!room.problemB;

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#050508", fontFamily: "Inter, sans-serif", color: "#eee8f5",
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated CSS */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes gridPan { 0%{background-position:0 0}100%{background-position:50px 50px} }
        @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.06)} }
        @keyframes timerPulse { 0%,100%{box-shadow:0 0 30px rgba(212,160,83,0.15), inset 0 0 30px rgba(212,160,83,0.05)}50%{box-shadow:0 0 50px rgba(212,160,83,0.3), inset 0 0 40px rgba(212,160,83,0.08)} }
        @keyframes scanline { 0%{top:-100%}100%{top:100%} }
        @keyframes borderGlow { 0%,100%{border-color:rgba(126,93,189,0.2)}50%{border-color:rgba(126,93,189,0.5)} }
        .timer-box-active { animation: timerPulse 2s ease-in-out infinite; }
        .orb-anim { animation: orbFloat 4s ease-in-out infinite; }
      `}</style>

      {/* Background effects */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(126,93,189,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(126,93,189,0.03) 1px, transparent 1px)",
        backgroundSize: "48px 48px", animation: "gridPan 25s linear infinite",
      }} />
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(126,93,189,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(212,160,83,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />

      {/* Match starting countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(5,5,8,0.97)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.3em", color: "#7e5dbd", textTransform: "uppercase", animation: "pulse 1.5s ease-in-out infinite" }}>INITIALIZING BATTLE</span>
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  width: 160, height: 160, borderRadius: "50%", border: "3px solid #7e5dbd",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(17,17,24,0.9)", boxShadow: "0 0 60px rgba(126,93,189,0.4)",
                }}
              >
                <span style={{ fontSize: 72, fontWeight: 900, fontFamily: "JetBrains Mono, monospace", color: "#eee8f5", textShadow: "0 0 20px rgba(212,160,83,0.5)" }}>{countdown}</span>
              </motion.div>
              <span style={{ fontSize: 10, color: "#7a6b94", textTransform: "uppercase", letterSpacing: "0.2em", fontFamily: "monospace" }}>Loading battle core...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€â”€ HEADER â”€â”€â”€ */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", borderBottom: "1px solid rgba(30,30,46,0.6)",
        background: "rgba(17,17,24,0.5)", backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 8, color: "#a99bc2", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => e.target.style.color = "#d4a053"}
            onMouseLeave={(e) => e.target.style.color = "#a99bc2"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            EXIT LOBBY
          </button>
          <div style={{ width: 1, height: 16, background: "#2a1845" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5db885", boxShadow: "0 0 8px rgba(93,184,133,0.5)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#d4a053", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", textShadow: "0 0 8px rgba(212,160,83,0.4)" }}>
              LIVE LOBBY
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            textTransform: "uppercase", letterSpacing: "0.1em",
            background: "rgba(93,184,133,0.1)", border: "1px solid rgba(93,184,133,0.25)", color: "#5db885",
          }}>
            {players.length} / {maxPlayers} PLAYERS
          </span>
          <span style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            textTransform: "uppercase", letterSpacing: "0.1em",
            background: "rgba(212,160,83,0.08)", border: "1px solid rgba(212,160,83,0.2)", color: "#d4a053",
          }}>
            {room.battleFormat} MODE
          </span>
        </div>
      </header>

      {/* â”€â”€â”€ MAIN CONTENT â”€â”€â”€ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 32px 32px", position: "relative", zIndex: 1 }}>

        {/* â•â•â•â•â•â• GIANT TIMER SECTION â•â•â•â•â•â• */}
        <section style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "36px 0 28px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#7a6b94", textTransform: "uppercase", letterSpacing: "0.25em", fontFamily: "monospace", marginBottom: 12 }}>
            CHALLENGE FRAMING COUNTDOWN
          </span>
          <div
            className={timerActive ? "timer-box-active" : ""}
            style={{
              padding: "20px 60px", borderRadius: 24,
              background: timerActive
                ? "linear-gradient(135deg, rgba(212,160,83,0.05), rgba(17,17,24,0.95))"
                : "rgba(17,17,24,0.6)",
              border: timerActive
                ? "2px solid rgba(212,160,83,0.3)"
                : "2px solid rgba(30,30,46,0.5)",
              position: "relative", overflow: "hidden",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}
          >
            {timerActive && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #d4a053, transparent)" }} />
            )}
            <span style={{
              fontSize: 52, fontWeight: 900, fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.08em", lineHeight: 1,
              color: timerActive ? "#d4a053" : "#d4a053",
              textShadow: timerActive
                ? "0 0 20px rgba(212,160,83,0.5), 0 0 40px rgba(212,160,83,0.2)"
                : "0 0 15px rgba(212,160,83,0.3)",
            }}>
              {timerActive ? timerDisplay : "AWAITING OPPONENT"}
            </span>
            <span style={{ fontSize: 9, color: "#7a6b94", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>
              {timerActive ? "REMAINING TO FRAME CHALLENGES" : "TIMER STARTS WHEN ALL PLAYERS JOIN"}
            </span>
          </div>
        </section>

        {/* â•â•â•â•â•â• VS MATCHUP SECTION â•â•â•â•â•â• */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24,
          alignItems: "stretch", padding: "0 0 28px",
        }}>
          {/* Team Alpha */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: teamAColor, boxShadow: `0 0 8px rgba(${teamARgb},0.5)` }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: teamAColor, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>
                  ALPHA SQUAD {teamAIsMe ? "(MY TEAM)" : "(OPPONENT)"}
                </span>
              </div>
              {/* Challenge status */}
              {room.problemA ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#5db885", textTransform: "uppercase", letterSpacing: "0.1em" }}>âœ… READY</span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#d4a053", textTransform: "uppercase", letterSpacing: "0.1em", animation: "pulse 2s ease-in-out infinite" }}>â³ FRAMING</span>
              )}
            </div>
            <PlayerCard
              player={teamA[0] || null}
              team="A"
              selectedLanguage={room.playerLanguages?.[teamA[0]?._id || teamA[0]]}
              isMe={(teamA[0]?._id || teamA[0]) === user?._id}
              onChangeLanguage={handleSelectLanguage}
              glow={teamAColor}
              glowRgb={teamARgb}
            />
            {room.battleFormat === "2v2" && (
              <PlayerCard
                player={teamA[1] || null}
                team="A"
                selectedLanguage={room.playerLanguages?.[teamA[1]?._id || teamA[1]]}
                isMe={(teamA[1]?._id || teamA[1]) === user?._id}
                onChangeLanguage={handleSelectLanguage}
                glow={teamAColor}
                glowRgb={teamARgb}
              />
            )}
            
            {/* Alpha Challenge Card */}
            <ChallengeFramingCard
              teamLabel="ALPHA SQUAD"
              isMyTeam={teamAIsMe}
              problem={room.problemA}
              roomId={room.roomId}
              color={teamAColor}
              rgb={teamARgb}
            />
          </div>

          {/* Central VS Orb */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 12px" }}>
            <div
              className="orb-anim"
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `radial-gradient(circle, ${teamAColor} 0%, ${teamBColor} 50%, transparent 100%)`,
                boxShadow: `0 0 30px ${teamAColor}, 0 0 60px rgba(${teamBRgb},0.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", inset: 3, border: "1px solid rgba(126,93,189,0.15)", borderRadius: "50%", animation: "orbFloat 6s ease-in-out infinite reverse" }} />
              <span style={{ fontSize: 16, fontWeight: 900, color: "#eee8f5", fontStyle: "italic", letterSpacing: "0.1em", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>VS</span>
            </div>
          </div>

          {/* Team Beta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: teamBColor, boxShadow: `0 0 8px rgba(${teamBRgb},0.5)` }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: teamBColor, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>
                  BETA SQUAD {!teamAIsMe ? "(MY TEAM)" : "(OPPONENT)"}
                </span>
              </div>
              {room.problemB ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#5db885", textTransform: "uppercase", letterSpacing: "0.1em" }}>âœ… READY</span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#d4a053", textTransform: "uppercase", letterSpacing: "0.1em", animation: "pulse 2s ease-in-out infinite" }}>â³ FRAMING</span>
              )}
            </div>
            <PlayerCard
              player={teamB[0] || null}
              team="B"
              selectedLanguage={room.playerLanguages?.[teamB[0]?._id || teamB[0]]}
              isMe={(teamB[0]?._id || teamB[0]) === user?._id}
              onChangeLanguage={handleSelectLanguage}
              glow={teamBColor}
              glowRgb={teamBRgb}
            />
            {room.battleFormat === "2v2" && (
              <PlayerCard
                player={teamB[1] || null}
                team="B"
                selectedLanguage={room.playerLanguages?.[teamB[1]?._id || teamB[1]]}
                isMe={(teamB[1]?._id || teamB[1]) === user?._id}
                onChangeLanguage={handleSelectLanguage}
                glow={teamBColor}
                glowRgb={teamBRgb}
              />
            )}

            {/* Beta Challenge Card */}
            <ChallengeFramingCard
              teamLabel="BETA SQUAD"
              isMyTeam={!teamAIsMe}
              problem={room.problemB}
              roomId={room.roomId}
              color={teamBColor}
              rgb={teamBRgb}
            />
          </div>
        </section>

        {/* â•â•â•â•â•â• BOTTOM GRID: Room Config & Room ID / Launch â•â•â•â•â•â• */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
          marginTop: 12
        }}>
          {/* Left: Room Config */}
          <div style={{
            background: "rgba(17,17,24,0.5)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(30,30,46,0.5)", borderRadius: 20,
            padding: 24, display: "flex", flexDirection: "column", gap: 16,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a99bc2", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", borderBottom: "1px solid rgba(30,30,46,0.5)", paddingBottom: 10 }}>ROOM CONFIG</span>

            {[
              ["Architect", room.creatorId?.username || "Host"],
              ["Format", `${room.battleFormat} Duel`],
              ["Difficulty", room.problem?.difficulty || "Custom"],
              ["Time Limit", `${room.problem?.timeLimit || 10} Minutes`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "#7a6b94", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>{label}</span>
                <span style={{ fontWeight: 700, color: "#eee8f5" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right: Share Room ID + Launch Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "space-between" }}>
            {/* Room ID Copy */}
            <div style={{
              background: "rgba(17,17,24,0.5)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(30,30,46,0.5)", borderRadius: 20,
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#a99bc2", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>SHARE ROOM ID</span>
              <p style={{ fontSize: 11, color: "#7a6b94", lineHeight: 1.5, margin: 0 }}>
                Send this code to your opponent. They paste it on their dashboard to join.
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(5,5,8,0.9)", borderRadius: 14, padding: "6px 6px 6px 20px",
                border: "1px solid rgba(30,30,46,0.5)",
              }}>
                <span style={{
                  flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800,
                  color: "#d4a053", letterSpacing: "0.2em", textTransform: "uppercase",
                  textShadow: "0 0 12px rgba(212,160,83,0.3)",
                }}>{room.roomId}</span>
                <button
                  onClick={handleCopyRoomId}
                  style={{
                    padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(30,30,46,0.5)",
                    background: "rgba(26,26,36,0.8)", color: "#eee8f5", fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#d4a053"; e.target.style.color = "#050508"; }}
                  onMouseLeave={(e) => { e.target.style.background = "rgba(26,26,36,0.8)"; e.target.style.color = "#eee8f5"; }}
                >COPY ID</button>
              </div>
              {isCreator && players.length < maxPlayers && (
                <button
                  onClick={() => {
                    loadFriendsList();
                    setShowInviteModal(true);
                  }}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(126,93,189,0.3)",
                    background: "rgba(126,93,189,0.08)", color: "#9478cc", fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
                    transition: "all 0.2s", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(126,93,189,0.16)"; e.currentTarget.style.borderColor = "#7e5dbd"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(126,93,189,0.08)"; e.currentTarget.style.borderColor = "rgba(126,93,189,0.3)"; }}
                >
                  ðŸ¤ Invite from Friends
                </button>
              )}
            </div>

            {/* Launch Button */}
            <div>
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
                      background: "linear-gradient(135deg, #7e5dbd, #9478cc, #d4a053)",
                      color: "#eee8f5",
                      boxShadow: "0 8px 32px rgba(126,93,189,0.35), 0 0 40px rgba(126,93,189,0.15)",
                      borderTop: "1px solid rgba(255,255,255,0.15)",
                    } : {
                      background: "rgba(17,17,24,0.7)",
                      border: "1px solid rgba(30,30,46,0.5)",
                      color: "#7a6b94",
                    }),
                  }}
                  onMouseEnter={(e) => { if (canStart && bothChallengesReady) e.target.style.filter = "brightness(1.15)"; }}
                  onMouseLeave={(e) => e.target.style.filter = "brightness(1)"}
                >
                  {canStart
                    ? (bothChallengesReady ? "ðŸš€ LAUNCH BATTLE" : "â³ WAITING FOR CHALLENGES")
                    : "â³ AWAITING OPPONENTS"}
                </button>
              ) : (
                <div style={{
                  width: "100%", padding: "18px", borderRadius: 16,
                  background: "rgba(17,17,24,0.5)", border: "1px solid rgba(30,30,46,0.4)",
                  textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                  color: "#a99bc2", textTransform: "uppercase", letterSpacing: "0.12em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  animation: "pulse 2s ease-in-out infinite",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a053", boxShadow: "0 0 8px rgba(212,160,83,0.5)" }} />
                  WAITING FOR HOST TO LAUNCH...
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(5,5,8,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{
                width: "440px", backgroundColor: "#1a1030", border: "1px solid #2a1845",
                borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#eee8f5" }}>ðŸ¤ Invite Friends to Battle</span>
                <button
                  onClick={() => setShowInviteModal(false)}
                  style={{ background: "none", border: "none", color: "#7a6b94", fontSize: "18px", cursor: "pointer" }}
                >âœ•</button>
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
                {friendsLoading ? (
                  <div style={{ color: "#7a6b94", fontSize: "13px", textAlign: "center", padding: "20px" }}>Loading friends...</div>
                ) : friends.length === 0 ? (
                  <div style={{ color: "#7a6b94", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                    No friends available. Search and add friends on your dashboard first.
                  </div>
                ) : (
                  friends.map((f) => (
                    <div key={f._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", backgroundColor: "#120b22", border: "1px solid #2a1845", borderRadius: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(126,93,189,0.15)", border: "1px solid rgba(126,93,189,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#b49fdb" }}>
                          {f.avatar || f.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#eee8f5", fontSize: "13px" }}>{f.username}</div>
                          <div style={{ fontSize: "11px", color: "#7a6b94" }}>ELO {f.eloRating}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInviteFriend(f.username)}
                        disabled={invitingFriend === f.username}
                        style={{
                          padding: "6px 12px", borderRadius: "8px", border: "none",
                          background: "linear-gradient(135deg, #7e5dbd, #9478cc)", color: "#fff",
                          fontSize: "11px", fontWeight: 700, cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {invitingFriend === f.username ? "Inviting..." : "âš”ï¸ Invite"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial Language Selector Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(5,5,8,0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "400px", backgroundColor: "#1a1030", border: "1px solid #2a1845",
                borderRadius: "24px", padding: "28px", display: "flex", flexDirection: "column", gap: "24px",
                textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 24 }}>âš”ï¸</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#eee8f5", margin: 0 }}>Select Coding Language</h3>
                <p style={{ fontSize: "12px", color: "#7a6b94", margin: 0, lineHeight: 1.5 }}>
                  Choose your target language for this battle. Your opponent will see this to frame your challenge appropriately.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { id: "javascript", label: "JavaScript" },
                  { id: "python", label: "Python" },
                  { id: "cpp", label: "C++" },
                  { id: "java", label: "Java" },
                  { id: "go", label: "Go" },
                  { id: "rust", label: "Rust" },
                  { id: "c", label: "C" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      handleSelectLanguage(lang.id);
                      setShowLanguageModal(false);
                    }}
                    style={{
                      padding: "12px", borderRadius: "12px", border: "1px solid #2a1845",
                      backgroundColor: "#120b22", color: "#eee8f5", fontSize: "12px", fontWeight: 700,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.target.style.borderColor = "#7e5dbd"; e.target.style.background = "rgba(126,93,189,0.05)"; }}
                    onMouseLeave={(e) => { e.target.style.borderColor = "#2a1845"; e.target.style.background = "#120b22"; }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Lobby;
