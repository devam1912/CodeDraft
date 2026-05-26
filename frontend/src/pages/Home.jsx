import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";

const CONTAINER_STYLE = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

const NAV_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 40px",
  borderBottom: "1px solid #1e1e2e",
  backdropFilter: "blur(12px)",
  backgroundColor: "rgba(10, 10, 15, 0.8)",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const LOGO_STYLE = {
  fontSize: "24px",
  fontWeight: 800,
  background: "linear-gradient(135deg, #6366f1, #22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-0.02em",
};

const HERO_STYLE = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 24px",
  textAlign: "center",
  position: "relative",
  zIndex: 1,
};

const HEADING_STYLE = {
  fontSize: "clamp(36px, 6vw, 72px)",
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
  marginBottom: "24px",
  maxWidth: "800px",
};

const GRADIENT_TEXT = {
  background: "linear-gradient(135deg, #6366f1, #22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const TAGLINE_STYLE = {
  fontSize: "clamp(16px, 2vw, 20px)",
  color: "#94a3b8",
  maxWidth: "600px",
  lineHeight: 1.6,
  marginBottom: "48px",
};

const CTA_ROW = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  justifyContent: "center",
};

const STATS_STRIP = {
  display: "flex",
  justifyContent: "center",
  gap: "48px",
  padding: "32px 24px",
  borderTop: "1px solid #1e1e2e",
  flexWrap: "wrap",
};

const STAT_ITEM = {
  textAlign: "center",
};

const STAT_NUMBER = {
  fontSize: "32px",
  fontWeight: 700,
  fontFamily: "JetBrains Mono, monospace",
  color: "#f8fafc",
};

const STAT_LABEL = {
  fontSize: "13px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginTop: "4px",
};

const STEPS_SECTION = {
  padding: "80px 24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const STEPS_HEADING = {
  fontSize: "28px",
  fontWeight: 700,
  marginBottom: "48px",
  textAlign: "center",
};

const STEPS_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "24px",
  maxWidth: "900px",
  width: "100%",
};

const STEP_CARD = {
  backgroundColor: "#111118",
  border: "1px solid #1e1e2e",
  borderRadius: "12px",
  padding: "32px 24px",
  textAlign: "center",
};

const STEP_ICON = {
  fontSize: "40px",
  marginBottom: "16px",
};

const STEP_TITLE = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "8px",
  color: "#f8fafc",
};

const STEP_DESC = {
  fontSize: "14px",
  color: "#94a3b8",
  lineHeight: 1.5,
};

const GLOW_ORB_1 = {
  position: "absolute",
  width: "600px",
  height: "600px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
  top: "-200px",
  right: "-200px",
  pointerEvents: "none",
};

const GLOW_ORB_2 = {
  position: "absolute",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)",
  bottom: "-100px",
  left: "-200px",
  pointerEvents: "none",
};

const FOOTER_STYLE = {
  padding: "24px 40px",
  borderTop: "1px solid #1e1e2e",
  textAlign: "center",
  color: "#64748b",
  fontSize: "13px",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={CONTAINER_STYLE}>
      <div style={GLOW_ORB_1} />
      <div style={GLOW_ORB_2} />

      <nav style={NAV_STYLE}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <span style={LOGO_STYLE}>CodeDraft</span>
        </Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isAuthenticated ? (
            <>
              <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                {user?.username}
              </span>
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <motion.div
        style={HERO_STYLE}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 style={HEADING_STYLE} variants={itemVariants}>
          You write the problem.{" "}
          <span style={GRADIENT_TEXT}>You win the battle.</span>
        </motion.h1>
        <motion.p style={TAGLINE_STYLE} variants={itemVariants}>
          The real-time competitive coding battle platform where every problem is
          written by participants, not admins. No curated problem bank. Every
          match is unique.
        </motion.p>
        <motion.div style={CTA_ROW} variants={itemVariants}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Create a Room</Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="lg">Start Battling</Button>
            </Link>
          )}
          <Button variant="secondary" size="lg">
            View Leaderboard
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        style={STATS_STRIP}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div style={STAT_ITEM}>
          <div style={STAT_NUMBER}>0</div>
          <div style={STAT_LABEL}>Matches Played</div>
        </div>
        <div style={STAT_ITEM}>
          <div style={STAT_NUMBER}>0</div>
          <div style={STAT_LABEL}>Active Now</div>
        </div>
        <div style={STAT_ITEM}>
          <div style={STAT_NUMBER}>0</div>
          <div style={STAT_LABEL}>Users Registered</div>
        </div>
      </motion.div>

      <div style={STEPS_SECTION}>
        <h2 style={STEPS_HEADING}>How it works</h2>
        <motion.div
          style={STEPS_GRID}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div style={STEP_CARD} variants={itemVariants}>
            <div style={STEP_ICON}>✍️</div>
            <div style={STEP_TITLE}>Write the Problem</div>
            <div style={STEP_DESC}>
              Create a custom coding problem with hidden test cases and validate
              it with your own reference solution.
            </div>
          </motion.div>
          <motion.div style={STEP_CARD} variants={itemVariants}>
            <div style={STEP_ICON}>⚔️</div>
            <div style={STEP_TITLE}>Battle Live</div>
            <div style={STEP_DESC}>
              Opponents see the problem for the first time when the countdown
              hits zero. Race to pass all test cases first.
            </div>
          </motion.div>
          <motion.div style={STEP_CARD} variants={itemVariants}>
            <div style={STEP_ICON}>📈</div>
            <div style={STEP_TITLE}>Climb the ELO</div>
            <div style={STEP_DESC}>
              Win battles to increase your ELO rating. Compete on global and
              college leaderboards with monthly seasons.
            </div>
          </motion.div>
        </motion.div>
      </div>

      <footer style={FOOTER_STYLE}>
        © {new Date().getFullYear()} CodeDraft. Built for coders who compete.
      </footer>
    </div>
  );
}

export default Home;
