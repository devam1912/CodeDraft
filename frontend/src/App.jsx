import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProblemEditor from "./pages/ProblemEditor";
import Lobby from "./pages/Lobby";
import BattleArena from "./pages/BattleArena";
import Leaderboard from "./pages/Leaderboard";
import TournamentArena from "./pages/TournamentArena";
import PublicProfile from "./pages/PublicProfile";


const TOAST_OPTIONS = {
  duration: 4000,
  style: {
    background: "#1a1030",
    color: "#eee8f5",
    border: "1px solid #2a1845",
    borderRadius: "12px",
    fontSize: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  success: {
    iconTheme: {
      primary: "#5db885",
      secondary: "#1a1030",
    },
  },
  error: {
    iconTheme: {
      primary: "#c75c4a",
      secondary: "#1a1030",
    },
  },
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId/edit"
            element={
              <ProtectedRoute>
                <ProblemEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId/battle"
            element={
              <ProtectedRoute>
                <BattleArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournament/:id"
            element={
              <ProtectedRoute>
                <TournamentArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/u/:username"
            element={
              <ProtectedRoute>
                <PublicProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
