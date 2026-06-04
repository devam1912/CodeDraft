import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import heroDuel from "../assets/hero_duel.jpg";

const PAGE_BG = {
  minHeight: "100vh",
  backgroundColor: "#030305",
  color: "#f8fafc",
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
  backgroundColor: "rgba(3, 3, 5, 0.75)",
  position: "sticky",
  top: 0,
  zIndex: 50
};

const LOGO_TEXT = {
  fontSize: "24px",
  fontWeight: 900,
  background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-0.03em"
};

const HERO_SECTION = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  alignItems: "center",
  gap: "36px",
  maxWidth: "1400px",
  margin: "0 auto",
  width: "100%",
  padding: "60px 40px",
  zIndex: 2,
  position: "relative"
};

const HERO_LEFT = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  textAlign: "left",
  maxWidth: "600px"
};

const HERO_RIGHT = {
  display: "flex",
  justifyContent: "center",
  width: "100%"
};

const BRAND_BADGE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(99, 102, 241, 0.1)",
  border: "1px solid rgba(99, 102, 241, 0.25)",
  fontSize: "12px",
  fontWeight: 700,
  color: "#a5b4fc",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "20px"
};

const HERO_TITLE = {
  fontSize: "clamp(40px, 4.5vw, 68px)",
  fontWeight: 900,
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
  marginBottom: "20px"
};

const DUAL_TEXT_GRADIENT = {
  background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const HERO_DESC = {
  fontSize: "clamp(15px, 1.2vw, 18px)",
  color: "#94a3b8",
  lineHeight: 1.6,
  marginBottom: "36px"
};

const CTA_GRID = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  width: "100%"
};

const STATS_BAND = {
  display: "flex",
  gap: "48px",
  marginTop: "48px",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  paddingTop: "24px",
  width: "100%"
};

const STAT_NUMBER = {
  fontSize: "32px",
  fontWeight: 800,
  fontFamily: "JetBrains Mono, monospace",
  color: "#f8fafc",
};

const STAT_LABEL = {
  fontSize: "12px",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginTop: "4px",
};

const SIMULATOR_BOX = {
  width: "100%",
  maxWidth: "800px",
  backgroundColor: "rgba(10, 10, 15, 0.75)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "16px",
  overflow: "hidden",
  backdropFilter: "blur(20px)",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
};

const CODE_A = [
  "function binarySearch(arr, target) {",
  "  let left = 0;",
  "  let right = arr.length - 1;",
  "  while (left <= right) {",
  "    const mid = Math.floor((left + right) / 2);",
  "    if (arr[mid] === target) return mid;",
  "    if (arr[mid] < target) {",
  "      left = mid + 1;",
  "    } else {",
  "      right = mid - 1;",
  "    }",
  "  }",
  "  return -1;",
  "}"
];

const CODE_B = [
  "function twoSum(nums, target) {",
  "  const map = new Map();",
  "  for (let i = 0; i < nums.length; i++) {",
  "    const diff = target - nums[i];",
  "    if (map.has(diff)) {",
  "      return [map.get(diff), i];",
  "    }",
  "    map.set(nums[i], i);",
  "  }",
  "  return [];",
  "}"
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

function Home() {
  const { isAuthenticated, user } = useAuth();
  const [simCodeA, setSimCodeA] = useState("");
  const [simCodeB, setSimCodeB] = useState("");
  
  const [testA, setTestA] = useState([
    { id: 1, label: "T1: Empty set", status: "pending" },
    { id: 2, label: "T2: Sorted keys", status: "pending" },
    { id: 3, label: "T3: Bounds check", status: "pending" }
  ]);

  const [testB, setTestB] = useState([
    { id: 1, label: "T1: Simple pairs", status: "pending" },
    { id: 2, label: "T2: Duplicate keys", status: "pending" },
    { id: 3, label: "T3: Zero offset", status: "pending" }
  ]);

  const [stats, setStats] = useState({ matches: 0, active: 0, users: 0 });

  useEffect(() => {
    let currentMatch = 0;
    let currentActive = 0;
    let currentUsers = 0;

    const interval = setInterval(() => {
      let updated = false;
      if (currentMatch < 14820) {
        currentMatch += 370;
        updated = true;
      }
      if (currentActive < 892) {
        currentActive += 28;
        updated = true;
      }
      if (currentUsers < 4210) {
        currentUsers += 105;
        updated = true;
      }

      setStats({
        matches: Math.min(14820, currentMatch),
        active: Math.min(892, currentActive),
        users: Math.min(4210, currentUsers)
      });

      if (!updated) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let charIdxA = 0;
    let lineIdxA = 0;
    let charIdxB = 0;
    let lineIdxB = 0;
    
    let bufferA = "";
    let bufferB = "";

    const typeInterval = setInterval(() => {
      let active = false;

      if (lineIdxA < CODE_A.length) {
        active = true;
        const currentLine = CODE_A[lineIdxA];
        if (charIdxA < currentLine.length) {
          bufferA += currentLine[charIdxA];
          setSimCodeA(bufferA + "█");
          charIdxA++;
        } else {
          bufferA += "\n";
          lineIdxA++;
          charIdxA = 0;
          setSimCodeA(bufferA);
          
          if (lineIdxA === 4) {
            setTestA(prev => prev.map((t, idx) => idx === 0 ? { ...t, status: "passed" } : t));
          } else if (lineIdxA === 8) {
            setTestA(prev => prev.map((t, idx) => idx === 1 ? { ...t, status: "passed" } : t));
          } else if (lineIdxA === CODE_A.length) {
            setTestA(prev => prev.map((t, idx) => idx === 2 ? { ...t, status: "passed" } : t));
          }
        }
      }

      if (lineIdxB < CODE_B.length) {
        active = true;
        const currentLine = CODE_B[lineIdxB];
        if (charIdxB < currentLine.length) {
          bufferB += currentLine[charIdxB];
          setSimCodeB(bufferB + "█");
          charIdxB++;
        } else {
          bufferB += "\n";
          lineIdxB++;
          charIdxB = 0;
          setSimCodeB(bufferB);
          
          if (lineIdxB === 5) {
            setTestB(prev => prev.map((t, idx) => idx === 0 ? { ...t, status: "passed" } : t));
          } else if (lineIdxB === 9) {
            setTestB(prev => prev.map((t, idx) => idx === 1 ? { ...t, status: "passed" } : t));
          } else if (lineIdxB === CODE_B.length) {
            setTestB(prev => prev.map((t, idx) => idx === 2 ? { ...t, status: "passed" } : t));
          }
        }
      }

      if (!active) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setSimCodeA("");
          setSimCodeB("");
          setTestA(prev => prev.map(t => ({ ...t, status: "pending" })));
          setTestB(prev => prev.map(t => ({ ...t, status: "pending" })));
        }, 3000);
      }
    }, 35);

    return () => clearInterval(typeInterval);
  }, [simCodeA === "" && simCodeB === ""]);

  return (
    <div style={PAGE_BG}>
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="secondaryGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>

      <div style={GLOW_ORB("-200px", null, "-100px", null, "rgba(99, 102, 241, 0.15)", "700px")} />
      <div style={GLOW_ORB(null, "-100px", null, "-200px", "rgba(34, 211, 238, 0.12)", "600px")} />

      <nav style={NAV_CONTAINER}>
        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={LOGO_TEXT}>CodeDraft</span>
          </Link>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <Link to="/leaderboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }} className="hover:text-white transition-colors">Leaderboard</Link>
            <Link to="/dashboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }} className="hover:text-white transition-colors">Tournaments</Link>
            <Link to="/dashboard" style={{ textDecoration: "none", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }} className="hover:text-white transition-colors">Spectate</Link>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isAuthenticated ? (
            <>
              <span style={{ color: "#94a3b8", fontSize: "14px", fontFamily: "JetBrains Mono, monospace" }}>
                👾 {user?.username}
              </span>
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" style={{ borderColor: "#6366f1", color: "#a5b4fc" }}>Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" style={{ backgroundColor: "#6366f1", color: "#ffffff", padding: "8px 16px" }}>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <motion.div 
        style={HERO_SECTION}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <HERO_LEFT_PANEL 
          isAuthenticated={isAuthenticated} 
          stats={stats} 
        />
        
        <HERO_RIGHT_PANEL />
      </motion.div>

      {/* Live Coding Duel Demo Section */}
      <div style={{ padding: "80px 40px", display: "flex", flexDirection: "column", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", backgroundColor: "#040407", position: "relative", zIndex: 5 }}>
        <div style={BRAND_BADGE}>Live Duel Telemetry</div>
        <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", textAlign: "center" }}>
          Watch a Live CodeDraft Battle
        </h2>
        <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "40px", maxWidth: "600px", textAlign: "center", lineHeight: 1.6 }}>
          See how opponents write algorithms, compile their buffers, and pass hidden test cases in real-time.
        </p>
        
        <HERO_DUEL_SIMULATOR 
          simCodeA={simCodeA}
          simCodeB={simCodeB}
          testA={testA}
          testB={testB}
        />
      </div>

      {/* College Standings Highlight Section */}
      <div style={{ padding: "80px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", backgroundColor: "#06060a", position: "relative", zIndex: 5 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={BRAND_BADGE}>Academic Standings</div>
          <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", textAlign: "center" }}>
            Academic League Highlights
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "40px", maxWidth: "600px", textAlign: "center", lineHeight: 1.6 }}>
            Top engineering institutions competing this month. Suffix your email with your college domain to challenge for your varsity standings.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", width: "100%" }}>
            {[
              { rank: 1, name: "Massachusetts Institute of Technology", short: "MIT", avgElo: 1845, members: 142, icon: "🎓", border: "#f59e0b" },
              { rank: 2, name: "Stanford University", short: "Stanford", avgElo: 1792, members: 118, icon: "🌲", border: "#10b981" },
              { rank: 3, name: "Indian Institute of Technology, Bombay", short: "IIT Bombay", avgElo: 1780, members: 164, icon: "🏛️", border: "#6366f1" }
            ].map(col => (
              <div 
                key={col.rank} 
                style={{ 
                  backgroundColor: "#0a0a0f", 
                  border: `1px solid rgba(255,255,255,0.05)`,
                  borderLeft: `4px solid ${col.border}`,
                  borderRadius: "12px", 
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  transition: "all 0.3s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: col.border, textTransform: "uppercase", letterSpacing: "0.08em" }}>Rank #{col.rank}</span>
                  <span style={{ fontSize: "20px" }}>{col.icon}</span>
                </div>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>{col.short}</h4>
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{col.name}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "12px", marginTop: "4px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", fontFamily: "JetBrains Mono, monospace" }}>{col.avgElo}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Average ELO</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", fontFamily: "JetBrains Mono, monospace" }}>{col.members}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Active Varsity</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Discover Battles Feed Section */}
      <div style={{ padding: "80px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", backgroundColor: "#030305", position: "relative", zIndex: 5 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={BRAND_BADGE}>Discover battles</div>
          <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", textAlign: "center" }}>
            Active Public Arenas
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "40px", maxWidth: "600px", textAlign: "center", lineHeight: 1.6 }}>
            Spectate active competitive coding battles currently being solved by developers live.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "900px" }}>
            {[
              { format: "1v1 Duel", playerA: { name: "lambda_wizard", elo: 1420 }, playerB: { name: "null_ptr", elo: 1390 }, problem: "Invert Binary Tree", spectators: 142, duration: "3m 42s" },
              { format: "2v2 Battle", playerA: { name: "Team Alpha", elo: 1310 }, playerB: { name: "Team Beta", elo: 1290 }, problem: "Dijkstra Shortest Path", spectators: 285, duration: "11m 15s" }
            ].map((duel, i) => (
              <div 
                key={i} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  backgroundColor: "#0a0a0f", 
                  border: "1px solid rgba(255,255,255,0.05)", 
                  borderRadius: "12px", 
                  padding: "16px 24px",
                  transition: "border-color 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "2px 8px", borderRadius: "999px" }}>
                    <span style={{ width: "6px", height: "6px", backgroundColor: "#ef4444", borderRadius: "50%", display: "inline-block" }} />
                    LIVE
                  </span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                      {duel.playerA.name} <span style={{ color: "#64748b", fontWeight: 400 }}>vs</span> {duel.playerB.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Problem: <span style={{ color: "#22d3ee", fontWeight: 600 }}>{duel.problem}</span> · Elapsed: {duel.duration}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>👁 {duel.spectators}</div>
                    <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>Spectating</div>
                  </div>
                  <Link to="/dashboard" style={{ textDecoration: "none" }}>
                    <Button variant="ghost" size="sm">Spectate Arena</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "80px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative", zIndex: 5, backgroundColor: "#06060a" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "48px", textAlign: "center", letterSpacing: "-0.02em" }}>
          Organic Coding Battles In 3 Steps
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ padding: "36px 28px", backgroundColor: "#0a0a0f", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", transition: "all 0.3s" }}>
            <div style={{ marginBottom: "20px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#primaryGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#f8fafc" }}>1. Build Your Battle Problem</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
              Draft an algorithms challenge, configure hidden verification test cases, and pass your own reference solution before staging it in the lobby arena.
            </p>
          </div>
          <div style={{ padding: "36px 28px", backgroundColor: "#0a0a0f", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", transition: "all 0.3s" }}>
            <div style={{ marginBottom: "20px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#primaryGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#f8fafc" }}>2. Duel Live Side-by-Side</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
              Both players receive the prompt at the exact same millisecond. Sync typing buffers, compile code, and watch the visual telemetry pass hidden cases.
            </p>
          </div>
          <div style={{ padding: "36px 28px", backgroundColor: "#0a0a0f", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", transition: "all 0.3s" }}>
            <div style={{ marginBottom: "20px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#secondaryGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#f8fafc" }}>3. Increase Multi-League ELO</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
              Win to increase your standing rank ELO weights. Compete in 1v1 duels, 2v2 collaborative teammates battles, and structured colleges leagues.
            </p>
          </div>
        </div>
      </div>

      <footer style={{ padding: "30px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", color: "#64748b", fontSize: "13px", zIndex: 5, backgroundColor: "#030305" }}>
        © {new Date().getFullYear()} CodeDraft. Built for developers who write the problems.
      </footer>
    </div>
  );
}

function HERO_LEFT_PANEL({ isAuthenticated, stats }) {
  return (
    <motion.div style={HERO_LEFT} variants={itemVariants}>
      <div style={BRAND_BADGE}>
        <span style={{ width: "8px", height: "8px", backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }} />
        P2P Coding Battles
      </div>
      <h1 style={HERO_TITLE}>
        You write the problem. <br />
        <span style={DUAL_TEXT_GRADIENT}>You win the battle.</span>
      </h1>
      <p style={HERO_DESC}>
        CodeDraft is a real-time competitive coding platform where there is no pre-written problem bank. The creator of the room writes the challenge. Opponents race to pass verification test cases first.
      </p>
      
      <div style={CTA_GRID}>
        {isAuthenticated ? (
          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <Button size="lg" style={{ padding: "14px 28px", fontSize: "15px", backgroundColor: "#6366f1", color: "#ffffff", border: "1px solid #6366f1" }}>⚔️ Initialize Battle Lobby</Button>
          </Link>
        ) : (
          <Link to="/register" style={{ textDecoration: "none" }}>
            <Button size="lg" style={{ padding: "14px 28px", fontSize: "15px", backgroundColor: "#6366f1", color: "#ffffff", border: "1px solid #6366f1" }}>Start Battling</Button>
          </Link>
        )}
        <Link to="/leaderboard" style={{ textDecoration: "none" }}>
          <Button variant="secondary" size="lg" style={{ padding: "14px 28px", fontSize: "15px", borderColor: "#6366f1", color: "#a5b4fc" }}>View Leaderboard</Button>
        </Link>
      </div>

      <div style={STATS_BAND}>
        <div>
          <div style={STAT_NUMBER}>{stats.matches.toLocaleString()}</div>
          <div style={STAT_LABEL}>Duels Completed</div>
        </div>
        <div>
          <div style={STAT_NUMBER}>{stats.active.toLocaleString()}</div>
          <div style={STAT_LABEL}>Combatants Active</div>
        </div>
        <div>
          <div style={STAT_NUMBER}>{stats.users.toLocaleString()}</div>
          <div style={STAT_LABEL}>Registered Users</div>
        </div>
      </div>
    </motion.div>
  );
}

function HERO_RIGHT_PANEL() {
  return (
    <motion.div style={HERO_RIGHT} variants={itemVariants}>
      <div style={{ position: "relative", width: "100%", maxWidth: "600px" }}>
        <div style={{
          position: "absolute",
          inset: "-3px",
          background: "linear-gradient(135deg, #6366f1, #22d3ee)",
          borderRadius: "20px",
          filter: "blur(12px)",
          opacity: 0.5,
          zIndex: 0
        }} />
        <motion.img 
          src={heroDuel} 
          alt="CodeDraft Battle Arena" 
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "block",
            position: "relative",
            zIndex: 1,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}

function HERO_DUEL_SIMULATOR({ simCodeA, simCodeB, testA, testB }) {
  return (
    <div style={SIMULATOR_BOX}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={{ width: "11px", height: "11px", backgroundColor: "#ef4444", borderRadius: "50%", display: "inline-block" }} />
          <span style={{ width: "11px", height: "11px", backgroundColor: "#f59e0b", borderRadius: "50%", display: "inline-block" }} />
          <span style={{ width: "11px", height: "11px", backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
          ⚔️ live_duel_telemetry.sh
        </span>
        <span style={{ width: "32px" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", height: "340px", overflow: "hidden" }}>
        {/* Player A Editor */}
        <div style={{ borderRight: "1px solid rgba(255, 255, 255, 0.05)", padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#818cf8" }}>👾 alpha_coder</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontFamily: "JetBrains Mono, monospace" }}>JS</span>
          </div>
          <div style={{ display: "flex", gap: "12px", fontFamily: "JetBrains Mono, monospace", fontSize: "12.5px", color: "#e2e8f0", overflowY: "auto", flex: 1, lineHeight: 1.6 }}>
            <div style={{ color: "#475569", textAlign: "right", select: "none", userSelect: "none" }}>
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "inherit", color: "inherit", whiteSpace: "pre-wrap", flex: 1 }}>
              {simCodeA}
            </pre>
          </div>
        </div>

        {/* Player B Editor */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#22d3ee" }}>⚡ beta_byte</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(34,211,238,0.1)", color: "#81e6d9", fontFamily: "JetBrains Mono, monospace" }}>JS</span>
          </div>
          <div style={{ display: "flex", gap: "12px", fontFamily: "JetBrains Mono, monospace", fontSize: "12.5px", color: "#e2e8f0", overflowY: "auto", flex: 1, lineHeight: 1.6 }}>
            <div style={{ color: "#475569", textAlign: "right", select: "none", userSelect: "none" }}>
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "inherit", color: "inherit", whiteSpace: "pre-wrap", flex: 1 }}>
              {simCodeB}
            </pre>
          </div>
        </div>
      </div>

      {/* Telemetry Testing Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "18px", backgroundColor: "rgba(0,0,0,0.25)" }}>
        {/* Test cases A */}
        <div style={{ borderRight: "1px solid rgba(255, 255, 255, 0.05)", paddingRight: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Test Status</div>
          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            {testA.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                <span style={{ color: "#94a3b8" }}>{t.label}</span>
                <span style={{ 
                  fontWeight: 800, 
                  color: t.status === "passed" ? "#10b981" : "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {t.status === "passed" ? "✓ Pass" : (
                    <span style={{ display: "inline-flex", alignItems: "center", animation: "pulse 1s infinite" }}>
                      ⌛ Pending
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Test cases B */}
        <div style={{ paddingLeft: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Test Status</div>
          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            {testB.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                <span style={{ color: "#94a3b8" }}>{t.label}</span>
                <span style={{ 
                  fontWeight: 800, 
                  color: t.status === "passed" ? "#10b981" : "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {t.status === "passed" ? "✓ Pass" : (
                    <span style={{ display: "inline-flex", alignItems: "center", animation: "pulse 1s infinite" }}>
                      ⌛ Pending
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
