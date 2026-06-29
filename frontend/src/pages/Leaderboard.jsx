import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

const PAGE_STYLE = {
  minHeight: "100vh",
  backgroundColor: "#0d0818",
  color: "#eee8f5",
  fontFamily: "Inter, sans-serif",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};

const GLOW_ORB = (top, left, right, bottom, color, size = "600px") => ({
  position: "absolute",
  width: size,
  height: size,
  top,
  left,
  right,
  bottom,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
  filter: "blur(60px)",
  pointerEvents: "none",
  zIndex: 0,
});

const NAV_CONTAINER = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 40px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(20px)",
  backgroundColor: "rgba(13, 8, 24, 0.75)",
  position: "sticky",
  top: 0,
  zIndex: 50
};

const LOGO_TEXT = {
  fontSize: "24px",
  fontWeight: 900,
  background: "linear-gradient(135deg, #7e5dbd 0%, #d4a053 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-0.03em"
};

const MAIN_STYLE = {
  flex: 1,
  maxWidth: "1200px",
  width: "100%",
  margin: "0 auto",
  padding: "40px 24px",
  position: "relative",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: "32px"
};

const BRAND_BADGE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(126, 93, 189, 0.1)",
  border: "1px solid rgba(126, 93, 189, 0.25)",
  fontSize: "12px",
  fontWeight: 700,
  color: "#b49fdb",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "8px"
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        if (filterType === "colleges") {
          const response = await userAPI.getCollegeLeaderboard();
          setColleges(response.data?.colleges || response.colleges || []);
          setIsLoading(false);
          return;
        }

        const params = { page: currentPage, limit: 15 };
        if (filterType === "college" && user?.college) params.college = user.college;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const response = await userAPI.getLeaderboard(params);
        setUsers(response.data?.users || response.users || []);
        setPagination(response.data?.pagination || response.pagination || { currentPage: 1, totalPages: 1 });
      } catch (err) {
        toast.error(err.message || "Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPage, filterType, searchQuery, user?.college]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const podiumUsers = users.slice(0, 3);
  const listUsers = users.slice(3);

  const getPodiumOrder = () => {
    const order = [];
    // 2nd Place
    if (podiumUsers[1]) {
      order.push({
        user: podiumUsers[1],
        rank: 2,
        color: "#b49fdb",
        bg: "rgba(203, 213, 225, 0.05)",
        icon: "🥈",
        gradient: "linear-gradient(135deg, rgba(203,213,225,0.08), rgba(203,213,225,0.02))",
        height: "220px"
      });
    }
    // 1st Place
    if (podiumUsers[0]) {
      order.push({
        user: podiumUsers[0],
        rank: 1,
        color: "#d4a053",
        bg: "rgba(212, 160, 83, 0.1)",
        icon: "🏆",
        gradient: "linear-gradient(135deg, rgba(126,93,189,0.15), rgba(212,160,83,0.05))",
        height: "250px"
      });
    }
    // 3rd Place
    if (podiumUsers[2]) {
      order.push({
        user: podiumUsers[2],
        rank: 3,
        color: "#b45309",
        bg: "rgba(180, 83, 9, 0.05)",
        icon: "🥉",
        gradient: "linear-gradient(135deg, rgba(180,83,9,0.08), rgba(180,83,9,0.02))",
        height: "200px"
      });
    }
    return order;
  };

  return (
    <div style={PAGE_STYLE}>
      <div style={GLOW_ORB("-200px", null, "-100px", null, "rgba(126, 93, 189, 0.12)", "700px")} />
      <div style={GLOW_ORB(null, "-100px", null, "-200px", "rgba(212, 160, 83, 0.1)", "600px")} />

      <nav className="responsive-nav-bar">
        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={LOGO_TEXT}>CodeDraft</span>
          </Link>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link to="/leaderboard" style={{ textDecoration: "none", color: "#ffffff", fontSize: "14px", fontWeight: 700 }}>Leaderboard</Link>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <motion.main 
        style={MAIN_STYLE}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <div style={BRAND_BADGE}>Platform Standings</div>
            <h1 style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "8px" }}>
              ELO League Standings
            </h1>
            <p style={{ fontSize: "14px", color: "#a99bc2" }}>
              See who sits at the top of the competitive arena ranks.
            </p>
          </div>

          <div style={{ display: "flex", backgroundColor: "#120b22", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "4px", borderRadius: "12px", gap: "4px", alignSelf: "flex-start", marginTop: "12px" }}>
            {[
              { key: "global", label: "Global" },
              { key: "college", label: user?.college ? `${user.college} League` : "My College", disabled: !user?.college },
              { key: "colleges", label: "Colleges" },
            ].map(({ key, label, disabled }) => (
              <button
                key={key}
                disabled={disabled}
                onClick={() => handleFilterChange(key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.3 : 1,
                  backgroundColor: filterType === key ? "rgba(126, 93, 189, 0.15)" : "transparent",
                  color: filterType === key ? "#b49fdb" : "#a99bc2",
                  transition: "all 0.2s"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {filterType !== "colleges" && (
          <motion.div variants={itemVariants} style={{ width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a99bc2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search fighters by username..."
              style={{
                width: "100%",
                padding: "14px 20px 14px 48px",
                borderRadius: "12px",
                backgroundColor: "#120b22",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: "#eee8f5",
                fontSize: "14px",
                fontFamily: "JetBrains Mono, monospace"
              }}
            />
          </motion.div>
        )}

        {isLoading ? (
          <div style={{ flex: 1, padding: "80px 0", textAlign: "center", fontSize: "14px", fontFamily: "JetBrains Mono, monospace", color: "#7a6b94", animation: "pulse 1s infinite" }}>
            Retrieving standings history records...
          </div>
        ) : users.length === 0 && filterType !== "colleges" ? (
          <Card style={{ textAlign: "center", padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "40px" }}>🏅</span>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#eee8f5" }}>No competitors found</h3>
            <p style={{ fontSize: "13px", color: "#a99bc2" }}>
              Adjust your search criteria or register a college tag to broaden findings.
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {currentPage === 1 && !searchQuery && podiumUsers.length > 0 && filterType !== "colleges" && (
              <motion.div 
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", alignItems: "end", marginTop: "16px" }}
                variants={itemVariants}
              >
                {getPodiumOrder().map(({ user: podUser, rank, color, bg, icon, gradient, height }) => (
                  <Card
                    key={podUser._id}
                    style={{
                      background: gradient,
                      border: rank === 1 ? "1px solid #7e5dbd" : "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "16px",
                      padding: "32px 24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: "16px",
                      position: "relative",
                      overflow: "hidden",
                      minHeight: height,
                      boxShadow: rank === 1 ? "0 10px 30px rgba(126, 93, 189, 0.15)" : "0 4px 20px rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: rank === 1 ? "linear-gradient(90deg, #7e5dbd, #d4a053)" : color }} />
                    
                    <div style={{ position: "relative" }}>
                      <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", border: `2px solid rgba(255,255,255,0.08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
                        {podUser.avatar || "👤"}
                      </div>
                      <div style={{ position: "absolute", bottom: "-6px", right: "-6px", width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#0d0818", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900 }}>
                        {rank}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#eee8f5", marginBottom: "4px" }}>
                        {podUser.username}
                      </h4>
                      <span style={{ fontSize: "10px", color: "#7a6b94", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", fontFamily: "JetBrains Mono, monospace" }}>
                        🎓 {podUser.college || "Independent"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: "28px", fontWeight: 900, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #b49fdb 0%, #7e5dbd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {podUser.eloRating}
                      </span>
                      <span style={{ fontSize: "9px", color: "#7a6b94", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
                        Rating ELO
                      </span>
                    </div>

                    <div style={{ fontSize: "11px", color: "#a99bc2", fontFamily: "JetBrains Mono, monospace", display: "flex", gap: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "12px", width: "100%", justifyContent: "center" }}>
                      <span>Wins: <span style={{ color: "#5db885", fontWeight: 700 }}>{podUser.wins || 0}</span></span>
                      <span>Losses: <span style={{ color: "#c75c4a", fontWeight: 700 }}>{podUser.losses || 0}</span></span>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}

            <motion.div variants={itemVariants} style={{ width: "100%" }}>
              {filterType === "colleges" ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Rank</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "left" }}>College / Institution</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Members</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Top ELO</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "right" }}>Avg ELO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colleges.map((col, idx) => {
                          const isViewerCollege = col.college === user?.college;
                          return (
                            <tr
                              key={col.college}
                              style={{ 
                                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                borderLeft: isViewerCollege ? "3px solid #7e5dbd" : "3px solid transparent",
                                backgroundColor: isViewerCollege ? "rgba(126, 93, 189, 0.04)" : "transparent"
                              }}
                            >
                              <td style={{ padding: "14px 20px", textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#7a6b94" }}>#{idx + 1}</td>
                              <td style={{ padding: "14px 20px", fontWeight: 700, color: "#eee8f5" }}>🎓 {col.college}</td>
                              <td style={{ padding: "14px 20px", textAlign: "center", color: "#a99bc2", fontFamily: "JetBrains Mono, monospace" }}>{col.memberCount}</td>
                              <td style={{ padding: "14px 20px", textAlign: "center", color: "#d4a053", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{col.topElo}</td>
                              <td style={{ padding: "14px 20px", textAlign: "right", color: "#d4a053", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", fontSize: "14px" }}>{col.avgElo}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Rank</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "left" }}>Competitor</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "left" }}>College</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Wins</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Losses</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "center" }}>Win%</th>
                          <th style={{ padding: "14px 20px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", textAlign: "right" }}>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentPage === 1 && !searchQuery ? listUsers : users).length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: "48px 20px", textAlign: "center", color: "#7a6b94", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                              <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>📭</span>
                              More fighters entering the arena soon...
                            </td>
                          </tr>
                        ) : (
                          (currentPage === 1 && !searchQuery ? listUsers : users).map((listUser, idx) => {
                          const rankNumber = (currentPage - 1) * 15 + (currentPage === 1 && !searchQuery ? idx + 4 : idx + 1);
                          const isViewer = user?._id === listUser._id || user?.username === listUser.username;
                          const winPct = listUser.wins + listUser.losses > 0
                            ? Math.round((listUser.wins / (listUser.wins + listUser.losses)) * 100)
                            : 0;
                          return (
                            <tr
                              key={listUser._id}
                              style={{ 
                                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                borderLeft: isViewer ? "3px solid #7e5dbd" : "3px solid transparent",
                                backgroundColor: isViewer ? "rgba(126, 93, 189, 0.04)" : "transparent",
                                transition: "background-color 0.15s"
                              }}
                            >
                              <td style={{ padding: "14px 20px", textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#7a6b94" }}>#{rankNumber}</td>
                              <td style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                                    {listUser.avatar || "👤"}
                                  </div>
                                  <span style={{ fontWeight: 700, color: isViewer ? "#b49fdb" : "#eee8f5" }}>
                                    {listUser.username}{isViewer ? " (You)" : ""}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "14px 20px", color: "#a99bc2" }}>{listUser.college || "Independent"}</td>
                              <td style={{ padding: "14px 20px", textAlign: "center", color: "#5db885", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{listUser.wins || 0}</td>
                              <td style={{ padding: "14px 20px", textAlign: "center", color: "#c75c4a", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{listUser.losses || 0}</td>
                              <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 800, color: winPct >= 50 ? "#5db885" : "#c75c4a", fontFamily: "JetBrains Mono, monospace" }}>{winPct}%</td>
                              <td style={{ padding: "14px 20px", textAlign: "right", color: "#d4a053", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", fontSize: "14px" }}>{listUser.eloRating}</td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>

                  {pagination.totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span style={{ color: "#7a6b94" }}>
                        Page {currentPage} of {pagination.totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={currentPage === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          </div>
        )}
      </motion.main>
    </div>
  );
}

export default Leaderboard;
