import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

const PAGE_STYLE = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};

const NAV_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 40px",
  borderBottom: "1px solid #1e1e2e",
  backdropFilter: "blur(12px)",
  backgroundColor: "rgba(10, 10, 15, 0.8)",
};

const LOGO_STYLE = {
  fontSize: "24px",
  fontWeight: 800,
  background: "linear-gradient(135deg, #6366f1, #22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-0.02em",
};

const CONTENT_STYLE = {
  flex: 1,
  padding: "40px",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
};

const GREETING_STYLE = {
  fontSize: "28px",
  fontWeight: 700,
  marginBottom: "8px",
};

const SUBTEXT_STYLE = {
  fontSize: "14px",
  color: "#94a3b8",
  marginBottom: "32px",
};

const ELO_DISPLAY = {
  fontSize: "48px",
  fontWeight: 700,
  fontFamily: "JetBrains Mono, monospace",
  background: "linear-gradient(135deg, #6366f1, #22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const ELO_LABEL = {
  fontSize: "13px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginTop: "4px",
};

const STATS_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "16px",
  marginTop: "24px",
};

const STAT_VALUE = {
  fontSize: "24px",
  fontWeight: 700,
  fontFamily: "JetBrains Mono, monospace",
  color: "#f8fafc",
};

const STAT_LABEL_STYLE = {
  fontSize: "12px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginTop: "2px",
};

const EMPTY_STATE = {
  textAlign: "center",
  padding: "48px 24px",
  color: "#94a3b8",
};

const EMPTY_ICON = {
  fontSize: "48px",
  marginBottom: "16px",
};

const EMPTY_HEADING = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#f8fafc",
  marginBottom: "8px",
};

const EMPTY_DESC = {
  fontSize: "14px",
  color: "#94a3b8",
  marginBottom: "24px",
};

const SECTION_HEADING = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "16px",
  marginTop: "32px",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div style={PAGE_STYLE}>
      <nav style={NAV_STYLE}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <span style={LOGO_STYLE}>CodeDraft</span>
        </Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>
            {user?.username}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </nav>

      <motion.div
        style={CONTENT_STYLE}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div style={GREETING_STYLE}>
            Welcome, {user?.username || "Challenger"}
          </div>
          <div style={SUBTEXT_STYLE}>Ready for your next battle?</div>
        </motion.div>

        <motion.div
          style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}
          variants={itemVariants}
        >
          <Card>
            <div style={ELO_DISPLAY}>{user?.eloRating || 1000}</div>
            <div style={ELO_LABEL}>ELO Rating</div>
            <div style={STATS_GRID}>
              <div>
                <div style={{ ...STAT_VALUE, color: "#10b981" }}>
                  {user?.wins || 0}
                </div>
                <div style={STAT_LABEL_STYLE}>Wins</div>
              </div>
              <div>
                <div style={{ ...STAT_VALUE, color: "#ef4444" }}>
                  {user?.losses || 0}
                </div>
                <div style={STAT_LABEL_STYLE}>Losses</div>
              </div>
              <div>
                <div style={{ ...STAT_VALUE, color: "#f59e0b" }}>
                  {user?.draws || 0}
                </div>
                <div style={STAT_LABEL_STYLE}>Draws</div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={EMPTY_STATE}>
              <div style={EMPTY_ICON}>📊</div>
              <div style={EMPTY_HEADING}>ELO History</div>
              <div style={EMPTY_DESC}>
                Your ELO history chart will appear here after your first match.
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div style={SECTION_HEADING}>Match History</div>
          <Card>
            <div style={EMPTY_STATE}>
              <div style={EMPTY_ICON}>⚔️</div>
              <div style={EMPTY_HEADING}>No matches yet</div>
              <div style={EMPTY_DESC}>
                You haven&apos;t battled yet. Create a room to start your journey.
              </div>
              <Button size="md">Create a Room</Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div style={SECTION_HEADING}>Problems Created</div>
          <Card>
            <div style={EMPTY_STATE}>
              <div style={EMPTY_ICON}>✍️</div>
              <div style={EMPTY_HEADING}>No problems created</div>
              <div style={EMPTY_DESC}>
                You haven&apos;t written any problems yet. Create a room to write your first battle problem.
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
