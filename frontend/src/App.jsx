import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

const TOAST_OPTIONS = {
  duration: 4000,
  style: {
    background: "#111118",
    color: "#f8fafc",
    border: "1px solid #1e1e2e",
    borderRadius: "12px",
    fontSize: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  success: {
    iconTheme: {
      primary: "#10b981",
      secondary: "#111118",
    },
  },
  error: {
    iconTheme: {
      primary: "#ef4444",
      secondary: "#111118",
    },
  },
};

function App() {
  return (
    <AuthProvider>
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
      </Routes>
    </AuthProvider>
  );
}

export default App;
