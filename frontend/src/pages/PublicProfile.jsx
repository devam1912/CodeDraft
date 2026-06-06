import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { userAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

const PAGE = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#0a0a0f",
  color: "#f8fafc",
  fontFamily: "Inter, sans-serif",
};

const NAV = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 32px",
  borderBottom: "1px solid #1e1e2e",
  backdropFilter: "blur(12px)",
  backgroundColor: "rgba(10,10,15,0.85)",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const LOGO = {
  fontSize: "20px",
  fontWeight: 800,
  background: "linear-gradient(135deg,#6366f1,#22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const MAIN = {
  flex: 1,
  maxWidth: "1000px",
  width: "100%",
  margin: "0 auto",
  padding: "40px 24px",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const CARD = {
  backgroundColor: "#111118",
  border: "1px solid #1e1e2e",
  borderRadius: "12px",
  padding: "24px",
};

const RESULT_BADGE = (r) => ({
  display: "inline-block",
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "2px 8px",
  borderRadius: "4px",
  backgroundColor: r === "win" ? "rgba(16,185,129,0.1)" : r === "loss" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
  color: r === "win" ? "#10b981" : r === "loss" ? "#ef4444" : "#f59e0b",
});

const DIFF_BADGE = (d) => ({
  fontSize: "9px",
  fontWeight: 700,
  textTransform: "uppercase",
  padding: "2px 6px",
  borderRadius: "3px",
  backgroundColor: d === "easy" ? "rgba(16,185,129,0.1)" : d === "medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
  color: d === "easy" ? "#10b981" : d === "medium" ? "#f59e0b" : "#ef4444",
  marginLeft: "8px",
});

const SECTION_HEAD = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "16px",
};

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChallenging, setIsChallenging] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await userAPI.getPublicProfile(username);
        setProfile(response.data || response);
      } catch (err) {
        toast.error("Profile not found");
        navigate("/leaderboard");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [username]);

  const handleChallenge = async () => {
    if (!profile) return;
    setIsChallenging(true);
    try {
      const response = await userAPI.sendChallengeInvite(username);
      toast.success(`Challenge sent to ${profile.username}!`);
      if (response.data?.roomId || response.roomId) {
        navigate(`/room/${response.data?.roomId || response.roomId}`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to send challenge invite");
    } finally {
      setIsChallenging(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <div style={{ fontSize: "24px" }}>⏳</div>
        <div style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser?.username === profile.username;
  const chartData = (profile.eloHistory || []).map((h, i) => ({ match: i + 1, elo: h.eloRating }));

  return (
    <div style={PAGE}>
      <nav style={NAV}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            ← Back
          </button>
          <span style={{ color: "#1e1e2e" }}>|</span>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={LOGO}>CodeDraft</span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link to="/leaderboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "13px" }}>Leaderboard</Link>
          <Link to="/dashboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "13px" }}>Dashboard</Link>
        </div>
      </nav>

      <motion.main style={MAIN} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#22d3ee)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {profile.avatar || profile.username?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#f8fafc", marginBottom: "2px" }}>{profile.username}</h1>
                {profile.college && (
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>🏛 {profile.college}{profile.degree ? ` · ${profile.degree}` : ""}{profile.year ? ` · ${profile.year}` : ""}</div>
                )}
                {profile.bio && (
                  <div style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", marginBottom: "4px", maxWidth: "320px" }}>"{profile.bio}"</div>
                )}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6366f1",
                      backgroundColor: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                    }}
                  >
                    Global Rank #{profile.globalRank}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      backgroundColor: "#1e1e2e",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    Joined {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {!isOwnProfile && (
                <Button
                  size="md"
                  onClick={handleChallenge}
                  disabled={isChallenging}
                  style={{ background: "linear-gradient(135deg,#6366f1,#22d3ee)", color: "#fff", border: "none" }}
                >
                  {isChallenging ? "Sending..." : "⚔ Challenge"}
                </Button>
              )}
              {isOwnProfile && (
                <Button size="md" variant="ghost" onClick={() => navigate("/dashboard")}>
                  My Dashboard
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
          {[
            { label: "ELO Rating", value: profile.eloRating, color: "linear-gradient(135deg,#6366f1,#22d3ee)", textFill: "transparent" },
            { label: "Wins", value: profile.wins, color: "#10b981" },
            { label: "Losses", value: profile.losses, color: "#ef4444" },
            { label: "Win Rate", value: `${profile.winPct}%`, color: profile.winPct >= 50 ? "#10b981" : "#ef4444" },
          ].map(({ label, value, color, textFill }) => (
            <Card key={label}>
              <div style={{
                fontSize: "28px",
                fontWeight: 800,
                fontFamily: "JetBrains Mono, monospace",
                background: textFill ? color : "none",
                WebkitBackgroundClip: textFill ? "text" : "unset",
                WebkitTextFillColor: textFill ? "transparent" : color,
                color: textFill ? "transparent" : color,
              }}>
                {value}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>
                {label}
              </div>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <Card>
            <div style={SECTION_HEAD}>ELO History</div>
            {chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b", fontSize: "13px" }}>
                No matches played yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profileEloGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                  <XAxis dataKey="match" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={2} fill="url(#profileEloGrad)" dot={{ fill: "#6366f1", r: 2, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <div style={SECTION_HEAD}>Recent Battles</div>
            {profile.recentMatches?.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b", fontSize: "13px" }}>
                No battles fought yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {profile.recentMatches?.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", backgroundColor: "#0a0a0f", borderRadius: "8px", border: "1px solid #1e1e2e" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={RESULT_BADGE(m.result)}>{m.result}</span>
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>vs {m.opponent?.username || "Unknown"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {m.eloChange !== null && m.eloChange !== undefined && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 700, color: m.eloChange >= 0 ? "#10b981" : "#ef4444" }}>
                          {m.eloChange >= 0 ? "+" : ""}{m.eloChange}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <div style={SECTION_HEAD}>Problems Created</div>
            {profile.recentProblems?.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: "13px" }}>
                No problems created yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {profile.recentProblems?.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#0a0a0f", borderRadius: "8px", border: "1px solid #1e1e2e" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", color: "#f8fafc", fontWeight: 500 }}>{p.title}</span>
                      <span style={DIFF_BADGE(p.difficulty)}>{p.difficulty}</span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "JetBrains Mono, monospace",
                        backgroundColor: "#1e1e2e",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default PublicProfile;
