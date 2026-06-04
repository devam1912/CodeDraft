import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { userAPI, matchAPI, adminAPI, roomAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import NotificationBell from "../components/ui/NotificationBell";
import toast from "react-hot-toast";

const PAGE_STYLE = { minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0a0a0f", color: "#f8fafc", fontFamily: "Inter, sans-serif" };
const NAV_STYLE = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #1e1e2e", backdropFilter: "blur(12px)", backgroundColor: "rgba(10, 10, 15, 0.8)" };
const LOGO_STYLE = { fontSize: "24px", fontWeight: 800, background: "linear-gradient(135deg, #6366f1, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" };
const CONTENT_STYLE = { flex: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%" };
const GREETING_STYLE = { fontSize: "28px", fontWeight: 700, marginBottom: "8px" };
const SUBTEXT_STYLE = { fontSize: "14px", color: "#94a3b8", marginBottom: "32px" };
const ELO_DISPLAY = { fontSize: "56px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #6366f1, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 };
const ELO_LABEL = { fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "6px" };
const RANK_BADGE = { display: "inline-block", fontSize: "11px", fontWeight: 700, color: "#6366f1", backgroundColor: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", padding: "2px 8px", marginTop: "8px" };
const STATS_GRID = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "20px" };
const STAT_VALUE = { fontSize: "22px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" };
const STAT_LABEL_STYLE = { fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" };
const EMPTY_STATE = { textAlign: "center", padding: "48px 24px", color: "#94a3b8" };
const EMPTY_ICON = { fontSize: "40px", marginBottom: "12px" };
const EMPTY_HEADING = { fontSize: "16px", fontWeight: 600, color: "#f8fafc", marginBottom: "6px" };
const EMPTY_DESC = { fontSize: "13px", color: "#94a3b8", marginBottom: "20px" };
const SECTION_HEADING = { fontSize: "16px", fontWeight: 600, marginBottom: "16px", marginTop: "32px", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" };
const DIFF_BADGE = (d) => ({ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 7px", borderRadius: "4px", backgroundColor: d === "easy" ? "rgba(16,185,129,0.12)" : d === "medium" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)", color: d === "easy" ? "#10b981" : d === "medium" ? "#f59e0b" : "#ef4444", border: "1px solid", borderColor: d === "easy" ? "rgba(16,185,129,0.3)" : d === "medium" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)" });

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "8px", padding: "8px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}>
        <div style={{ color: "#a5b4fc", fontWeight: 700 }}>ELO: {payload[0].value}</div>
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const { user, logout, checkSession } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [profile, setProfile] = useState(null);
  const [problems, setProblems] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [battleFormat, setBattleFormat] = useState("1v1");
  const [isBlitz, setIsBlitz] = useState(false);
  const [creatorCompeting, setCreatorCompeting] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [collegeEmailInput, setCollegeEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [telemetry, setTelemetry] = useState(null);

  const [activities, setActivities] = useState([
    { id: 1, message: "Welcome to CodeDraft! Live battle activity scrolling feed active.", timestamp: new Date() }
  ]);

  const handleCreateRoom = async () => {
    try {
      const response = await roomAPI.createRoom({
        battleFormat,
        isBlitz,
        creatorCompeting,
      });
      toast.success("Battle room lobby initialized!");
      navigate(`/room/${response.data.roomId || response.roomId}`);
    } catch (err) {
      toast.error(err.message || "Failed to initialize battle room");
    }
  };

  const handleJoinRoom = async () => {
    const trimmedId = joinRoomId.trim().toUpperCase();
    if (!trimmedId) {
      toast.error("Please enter a Room ID");
      return;
    }
    try {
      // Verify room exists first
      await roomAPI.getRoomDetails(trimmedId);
      setShowJoinModal(false);
      setJoinRoomId("");
      toast.success("Joining battle lobby...");
      navigate(`/room/${trimmedId}`);
    } catch (err) {
      toast.error(err.message || "Room not found. Check the Room ID and try again.");
    }
  };

  const handleUpdateAvatar = async (avatar) => {
    try {
      await userAPI.updateAvatar(avatar);
      await checkSession();
      toast.success("Avatar updated successfully!");
      setShowAvatarModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to update avatar");
    }
  };

  const handleVerifyCollege = async () => {
    try {
      if (!collegeEmailInput || !collegeEmailInput.includes("@")) {
        return toast.error("Please enter a valid email address");
      }
      await userAPI.verifyCollege(collegeEmailInput);
      await checkSession();
      toast.success("College standing successfully verified!");
      setShowVerifyModal(false);
    } catch (err) {
      toast.error(err.message || "Verification failed");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, probRes, histRes, telRes] = await Promise.allSettled([
          userAPI.getProfile(),
          userAPI.getProblemsCreated(),
          matchAPI.getMyMatchHistory(),
          adminAPI.getTelemetry(),
        ]);
        if (profileRes.status === "fulfilled") setProfile(profileRes.value.data || profileRes.value);
        if (probRes.status === "fulfilled") setProblems(probRes.value.data?.problems || []);
        if (histRes.status === "fulfilled") setMatchHistory(histRes.value.data?.history || histRes.value?.history || []);
        if (telRes.status === "fulfilled") setTelemetry(telRes.value.data || telRes.value);
      } catch (err) {
        toast.error("Failed to load dashboard data");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("global:activity", (act) => {
      setActivities((prev) => [
        { ...act, id: Date.now() },
        ...prev.slice(0, 9),
      ]);
    });
    return () => {
      socket.off("global:activity");
    };
  }, [socket]);


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const displayUser = profile || user;
  const eloHistory = profile?.eloHistory || [];
  const chartData = eloHistory.map((h, i) => ({ match: i + 1, elo: h.eloRating }));
  const globalRank = profile?.globalRank || null;
  const winPct = displayUser?.matchesPlayed > 0 ? Math.round(((displayUser.wins || 0) / displayUser.matchesPlayed) * 100) : 0;

  return (
    <div style={PAGE_STYLE}>
      <nav style={NAV_STYLE}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <span style={LOGO_STYLE}>CodeDraft</span>
        </Link>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/leaderboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "14px" }}>Leaderboard</Link>
          <NotificationBell />
          <span style={{ color: "#1e1e2e" }}>|</span>
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>{displayUser?.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Log Out</Button>
        </div>
      </nav>

      <div style={{ backgroundColor: "#111118", borderBottom: "1px solid #1e1e2e", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#6366f1", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", borderRight: "1px solid #1e1e2e", paddingRight: "12px", whiteSpace: "nowrap" }}>
          <span style={{ width: "8px", height: "8px", backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }} /> Live Feed
        </span>
        <div style={{ display: "flex", gap: "32px", overflowX: "auto", fontSize: "12px", color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>
          {activities.map((act) => (
            <span key={act.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <span style={{ color: "#6366f1" }}>✦</span>
              {act.message}
            </span>
          ))}
        </div>
      </div>

      <motion.div style={CONTENT_STYLE} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={GREETING_STYLE}>Welcome back, {displayUser?.username || "Challenger"} 👋</div>
            <div style={SUBTEXT_STYLE}>Track your performance, review matches, and challenge opponents.</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Button onClick={() => setShowJoinModal(true)} variant="ghost" style={{ padding: "12px 24px" }}>🎮 Join Room</Button>
            <Button onClick={() => setShowCreateModal(true)} variant="primary" style={{ padding: "12px 24px" }}>⚔️ Create Battle</Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "flex", gap: "12px", borderBottom: "1px solid #1e1e2e", paddingBottom: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: activeTab === "dashboard" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              border: activeTab === "dashboard" ? "1px solid #6366f1" : "1px solid transparent",
              color: activeTab === "dashboard" ? "#a5b4fc" : "#94a3b8",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            👤 My Dashboard
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: activeTab === "telemetry" ? "rgba(34, 211, 238, 0.15)" : "transparent",
              border: activeTab === "telemetry" ? "1px solid #22d3ee" : "1px solid transparent",
              color: activeTab === "telemetry" ? "#81e6d9" : "#94a3b8",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📊 System Telemetry
          </button>
        </motion.div>

        {activeTab === "dashboard" ? (
          <>
            <motion.div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }} variants={itemVariants}>
              <Card style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px", borderBottom: "1px solid #1e1e2e", paddingBottom: "12px" }}>
                  <div 
                    onClick={() => setShowAvatarModal(true)}
                    style={{ 
                      width: "60px", 
                      height: "60px", 
                      borderRadius: "50%", 
                      backgroundColor: "rgba(99,102,241,0.12)", 
                      border: "2px solid rgba(99,102,241,0.4)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: "30px", 
                      cursor: "pointer", 
                      transition: "all 0.2s" 
                    }}
                    title="Change Avatar"
                  >
                    {displayUser?.avatar || "💻"}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>{displayUser?.username}</div>
                    <div 
                      onClick={() => setShowAvatarModal(true)} 
                      style={{ fontSize: "11px", color: "#6366f1", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Edit Avatar
                    </div>
                    {displayUser?.collegeVerified ? (
                      <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, marginTop: "4px" }}>
                        🎓 {displayUser.college} (Verified)
                      </div>
                    ) : (
                      <div 
                        onClick={() => setShowVerifyModal(true)} 
                        style={{ fontSize: "10px", color: "#f59e0b", cursor: "pointer", textDecoration: "underline", marginTop: "4px", fontWeight: 600 }}
                      >
                        🎓 Verify College
                      </div>
                    )}
                  </div>
                </div>
                <div style={ELO_DISPLAY}>{displayUser?.eloRating || 1000}</div>
                <div style={ELO_LABEL}>ELO Rating</div>
                {globalRank && <div style={RANK_BADGE}>Global Rank #{globalRank}</div>}
                <div style={STATS_GRID}>
                  <div style={{ backgroundColor: "#0a0a0f", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#10b981" }}>{displayUser?.wins || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Wins</div>
                  </div>
                  <div style={{ backgroundColor: "#0a0a0f", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#ef4444" }}>{displayUser?.losses || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Losses</div>
                  </div>
                  <div style={{ backgroundColor: "#0a0a0f", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#f59e0b" }}>{displayUser?.draws || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Draws</div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#0a0a0f", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Win Rate</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "14px", fontWeight: 700, color: winPct >= 50 ? "#10b981" : "#ef4444" }}>{winPct}%</span>
                </div>
              </Card>
    
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>ELO History</span>
                  <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>Last {chartData.length} matches</span>
                </div>
                {chartData.length === 0 ? (
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>📊</div>
                    <div style={EMPTY_HEADING}>No matches yet</div>
                    <div style={EMPTY_DESC}>Complete your first battle to see your ELO chart appear here.</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                      <XAxis dataKey="match" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={2} fill="url(#eloGradient)" dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#a5b4fc" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </motion.div>
    
            <motion.div variants={itemVariants}>
              <div style={SECTION_HEADING}>
                <span>✍️</span> Problems Created
              </div>
              {problems.length === 0 ? (
                <Card>
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>✍️</div>
                    <div style={EMPTY_HEADING}>No problems created</div>
                    <div style={EMPTY_DESC}>Create a room to write your first battle problem and challenge opponents.</div>
                    <Button size="md" onClick={() => setShowCreateModal(true)}>Create a Room</Button>
                  </div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                  {problems.map((prob) => (
                    <Card key={prob.roomId} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc", lineHeight: 1.3 }}>{prob.title}</span>
                        <span style={DIFF_BADGE(prob.difficulty)}>{prob.difficulty}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
                        {prob.allowedLanguages?.join(", ")}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Battles:</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#f8fafc" }}>{prob.battlesPlayed}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
    
            <motion.div variants={itemVariants}>
              <div style={SECTION_HEADING}>
                <span>⚔️</span> Match History
              </div>
              {matchHistory.length === 0 ? (
                <Card>
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>⚔️</div>
                    <div style={EMPTY_HEADING}>No matches yet</div>
                    <div style={EMPTY_DESC}>You haven&apos;t battled yet. Create a room to start your journey.</div>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e1e2e", backgroundColor: "rgba(30,30,46,0.4)" }}>
                          {["Opponent", "Result", "Problem", "Time", "ELO Δ", "Replay"].map((h) => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: h === "Replay" ? "center" : "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((match, i) => {
                          const resultColor = match.result === "win" ? "#10b981" : match.result === "loss" ? "#ef4444" : "#f59e0b";
                          const resultBg = match.result === "win" ? "rgba(16,185,129,0.1)" : match.result === "loss" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";
                          const eloDelta = match.eloChange;
                          const min = match.durationSec ? Math.floor(match.durationSec / 60) : 0;
                          const sec = match.durationSec ? match.durationSec % 60 : 0;
                          return (
                            <tr key={match.roomId || i} style={{ borderBottom: "1px solid #1e1e2e" }}>
                              <td style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#a5b4fc" }}>
                                    {match.opponent?.avatar || match.opponent?.username?.slice(0, 2).toUpperCase() || "??"}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{match.opponent?.username || "Unknown"}</div>
                                    <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>ELO {match.opponent?.eloRating || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "4px", color: resultColor, backgroundColor: resultBg }}>
                                  {match.result}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px", color: "#94a3b8", maxWidth: "160px" }}>
                                {match.problemTitle || "—"}
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#94a3b8" }}>
                                {match.durationSec ? `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : "—"}
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: eloDelta == null ? "#64748b" : eloDelta >= 0 ? "#10b981" : "#ef4444" }}>
                                {eloDelta == null ? "—" : eloDelta >= 0 ? `+${eloDelta}` : eloDelta}
                              </td>
                              <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/room/${match.roomId}/replay`)}>
                                  ▶ Replay
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
    

          </>
        ) : (
          <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #1e1e2e", borderRadius: "12px", background: "linear-gradient(135deg, #111118, rgba(99,102,241,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Total Registered Combatants</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #a5b4fc, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.totalUsers ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Registered users in database</span>
              </Card>
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #1e1e2e", borderRadius: "12px", background: "linear-gradient(135deg, #111118, rgba(34,211,238,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Total Battles Completed</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #99f6e4, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.totalRooms ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Historical battle instances</span>
              </Card>
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #1e1e2e", borderRadius: "12px", background: "linear-gradient(135deg, #111118, rgba(16,185,129,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Active WebSocket Duels</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #a7f3d0, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.activeRoomsCount ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Rooms with status &quot;active&quot;</span>
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>💾</span> Sandbox & Node Memory Usage
                </div>
                
                {telemetry?.memory ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                      <span>V8 Heap Used</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {telemetry.memory.heapUsed} MB / {telemetry.memory.heapTotal} MB
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#0a0a0f", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, Math.round((telemetry.memory.heapUsed / telemetry.memory.heapTotal) * 100))}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, #6366f1, #818cf8)", 
                          borderRadius: "4px",
                          transition: "width 0.5s ease-in-out" 
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "13px" }}>Memory stats loading...</div>
                )}

                {telemetry?.memory ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                      <span>System Memory Usage</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {telemetry.memory.totalSystem - telemetry.memory.freeSystem} MB / {telemetry.memory.totalSystem} MB
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#0a0a0f", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, Math.round(((telemetry.memory.totalSystem - telemetry.memory.freeSystem) / telemetry.memory.totalSystem) * 100))}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, #22d3ee, #06b6d4)", 
                          borderRadius: "4px",
                          transition: "width 0.5s ease-in-out" 
                        }} 
                      />
                    </div>
                  </div>
                ) : null}

                {telemetry?.memory ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#0a0a0f", borderRadius: "8px", fontSize: "12px", border: "1px solid #1e1e2e" }}>
                    <span style={{ color: "#64748b" }}>Process Resident Set Size (RSS)</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#f8fafc" }}>{telemetry.memory.rss} MB</span>
                  </div>
                ) : null}
              </Card>

              <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚙️</span> Sandbox CPU & Load Averages
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#64748b" }}>CPU Model</span>
                    <span style={{ color: "#f8fafc", fontWeight: 600, textAlign: "right", maxWidth: "220px", fontSize: "11px" }}>{telemetry?.cpu?.model ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#64748b" }}>Processing Cores</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#f8fafc" }}>{telemetry?.cpu?.cores ?? "—"} Cores</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #1e1e2e", paddingTop: "12px", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>OS Load Averages (1m / 5m / 15m)</span>
                  {telemetry?.cpu?.loadAvg ? (
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      {telemetry.cpu.loadAvg.map((load, i) => (
                        <div key={i} style={{ flex: 1, backgroundColor: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: load > 2 ? "#ef4444" : "#10b981" }}>{load.toFixed(2)}</div>
                          <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", marginTop: "2px" }}>{i === 0 ? "1 min" : i === 1 ? "5 min" : "15 min"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Load averages not available</div>
                  )}
                </div>
              </Card>
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✍️</span> Rapid Problem Creators Audit
                </span>
                <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>Database aggregates</span>
              </div>
              
              {!telemetry?.creatorsAudit || telemetry.creatorsAudit.length === 0 ? (
                <div style={{ ...EMPTY_STATE, padding: "40px" }}>
                  <div style={EMPTY_ICON}>📭</div>
                  <div style={EMPTY_HEADING}>No problem creators found</div>
                  <div style={EMPTY_DESC}>User-generated battles will aggregate here.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e1e2e", backgroundColor: "rgba(30,30,46,0.4)" }}>
                        {["Rank", "Creator", "College / Institution", "Battles Written", "ELO Rating"].map((h) => (
                          <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry.creatorsAudit.map((creator, i) => (
                        <tr 
                          key={creator._id || i} 
                          style={{ borderBottom: "1px solid #1e1e2e" }}
                        >
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: i === 0 ? "#f59e0b" : i === 1 ? "#cbd5e1" : i === 2 ? "#b45309" : "#64748b" }}>
                            #{i + 1}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                                👤
                              </div>
                              <span style={{ fontWeight: 600, color: "#f8fafc" }}>{creator.username || "Anonymous"}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", color: creator.college ? "#10b981" : "#64748b", fontWeight: creator.college ? 600 : 400 }}>
                            {creator.college ? `🎓 ${creator.college}` : "Independent"}
                          </td>
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#a5b4fc" }}>
                            {creator.problemsCount} Problems
                          </td>
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#22d3ee" }}>
                            {creator.eloRating}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}

      </motion.div>

      {showAvatarModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center" }}>
          <div style={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "16px", padding: "24px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#f8fafc" }}>Select Gaming Avatar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
              {["💻", "🔥", "⚡", "🏆", "💀", "👾", "🤖", "🐼"].map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => handleUpdateAvatar(avatar)}
                  style={{
                    fontSize: "32px",
                    padding: "10px",
                    borderRadius: "12px",
                    backgroundColor: displayUser?.avatar === avatar ? "rgba(99,102,241,0.2)" : "#0a0a0f",
                    border: displayUser?.avatar === avatar ? "2px solid #6366f1" : "1px solid #1e1e2e",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  className="hover:scale-110 active:scale-95"
                >
                  {avatar}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowAvatarModal(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center" }}>
          <div style={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎮</div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>Join Battle Room</h3>
              <p style={{ fontSize: "13px", color: "#64748b" }}>Enter the Room ID shared by your opponent to enter their battle lobby.</p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Room ID</label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                placeholder="e.g. NKJAYE"
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#0a0a0f",
                  border: "1px solid #1e1e2e",
                  color: "#f8fafc",
                  fontSize: "18px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 700,
                  textAlign: "center",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "#1e1e2e"}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setShowJoinModal(false); setJoinRoomId(""); }}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleJoinRoom}>Join Lobby</Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center" }}>
          <div style={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "16px", padding: "24px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#f8fafc", textAlign: "center" }}>Create Coding Battle</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Battle Format</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setBattleFormat("1v1")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: battleFormat === "1v1" ? "rgba(99,102,241,0.15)" : "#0a0a0f",
                      border: battleFormat === "1v1" ? "1px solid #6366f1" : "1px solid #1e1e2e",
                      color: battleFormat === "1v1" ? "#a5b4fc" : "#94a3b8",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    1v1 Duel
                  </button>
                  <button
                    onClick={() => setBattleFormat("2v2")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: battleFormat === "2v2" ? "rgba(99,102,241,0.15)" : "#0a0a0f",
                      border: battleFormat === "2v2" ? "1px solid #6366f1" : "1px solid #1e1e2e",
                      color: battleFormat === "2v2" ? "#a5b4fc" : "#94a3b8",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    2v2 Team Battle
                  </button>
                </div>
              </div>

            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleCreateRoom}>Initialize Lobby</Button>
            </div>
          </div>
        </div>
      )}
      {showVerifyModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center" }}>
          <div style={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "#f8fafc" }}>🎓 Verify College Standing</h3>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
              Enter your university domain email (ending in <b>.edu</b> or <b>.ac.in</b>) to verify your academic league standing.
            </p>
            <input
              type="email"
              value={collegeEmailInput}
              onChange={(e) => setCollegeEmailInput(e.target.value)}
              placeholder="e.g. coder@mit.edu"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#0a0a0f",
                border: "1px solid #1e1e2e",
                color: "#f8fafc",
                fontSize: "13px",
                marginBottom: "20px",
                textAlign: "center"
              }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowVerifyModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleVerifyCollege}>Verify Suffix</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
