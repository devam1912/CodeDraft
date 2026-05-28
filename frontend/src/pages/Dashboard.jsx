import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  defs,
  linearGradient,
  stop,
  Area,
  AreaChart,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { userAPI, tournamentAPI, matchAPI } from "../services/api";
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

  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [battleFormat, setBattleFormat] = useState("1v1");
  const [isBlitz, setIsBlitz] = useState(false);
  const [creatorCompeting, setCreatorCompeting] = useState(false);

  const handleCreateRoom = async () => {
    try {
      const response = await roomAPI.createRoom({
        battleFormat,
        isBlitz,
        creatorCompeting,
      });
      toast.success("Battle room lobby initialized!");
      navigate(`/room/${response.data.roomId || response.roomId}/edit`);
    } catch (err) {
      toast.error(err.message || "Failed to initialize battle room");
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

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, tourRes, probRes, histRes] = await Promise.allSettled([
          userAPI.getProfile(),
          tournamentAPI.getTournaments(),
          userAPI.getProblemsCreated(),
          matchAPI.getMyMatchHistory(),
        ]);
        if (profileRes.status === "fulfilled") setProfile(profileRes.value.data || profileRes.value);
        if (tourRes.status === "fulfilled") setTournaments(tourRes.value.data || tourRes.value || []);
        if (probRes.status === "fulfilled") setProblems(probRes.value.data?.problems || []);
        if (histRes.status === "fulfilled") setMatchHistory(histRes.value.data?.history || histRes.value?.history || []);
      } catch (err) {
        toast.error("Failed to load dashboard data");
      }
    };
    load();
  }, []);

  const handleCreateTournament = async () => {
    const name = prompt("Enter the name of your new Bracket Tournament:");
    if (!name || !name.trim()) return;
    try {
      const response = await tournamentAPI.createTournament({ name: name.trim() });
      toast.success("Tournament draft created successfully!");
      navigate(`/tournament/${response.data._id || response._id}`);
    } catch (err) {
      toast.error(err.message || "Failed to create tournament.");
    }
  };

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

      <motion.div style={CONTENT_STYLE} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={GREETING_STYLE}>Welcome back, {displayUser?.username || "Challenger"} 👋</div>
            <div style={SUBTEXT_STYLE}>Track your performance, review matches, and challenge opponents.</div>
          </div>
          <div>
            <Button onClick={() => setShowCreateModal(true)} variant="primary" style={{ padding: "12px 24px" }}>⚔️ Create Battle</Button>
          </div>
        </motion.div>

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

        <motion.div variants={itemVariants}>
          <div style={{ ...SECTION_HEADING, justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span>🏆</span> Active Bracket Tournaments</span>
            <Button size="sm" onClick={handleCreateTournament}>Create Tournament</Button>
          </div>
          {tournaments.length === 0 ? (
            <Card>
              <div style={EMPTY_STATE}>
                <div style={EMPTY_ICON}>🏆</div>
                <div style={EMPTY_HEADING}>No tournaments drafting</div>
                <div style={EMPTY_DESC}>Create your own bracket draft tournament to challenge multiple developers!</div>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
              {tournaments.map((t) => (
                <Card key={t._id} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px" }}>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>{t.name}</h4>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t.status} · {t.participants?.length || 0} players
                    </span>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/tournament/${t._id}`)}>View Tournament</Button>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
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

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0a0a0f", padding: "12px", borderRadius: "8px", border: "1px solid #1e1e2e" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>⚡ Blitz Room</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Ultra-fast duels with a 5m lobby expiry</div>
                </div>
                <input
                  type="checkbox"
                  checked={isBlitz}
                  onChange={(e) => setIsBlitz(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#6366f1", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0a0a0f", padding: "12px", borderRadius: "8px", border: "1px solid #1e1e2e" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>⚔️ Compete as Host</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Host takes a 5 ELO penalty on victory</div>
                </div>
                <input
                  type="checkbox"
                  checked={creatorCompeting}
                  onChange={(e) => setCreatorCompeting(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#6366f1", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleCreateRoom}>Initialize Lobby</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
