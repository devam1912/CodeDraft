import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

const AUTH_STATES = {
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);

  const checkSession = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      setAuthState(AUTH_STATES.AUTHENTICATED);
    } catch {
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    setUser(response.data.user);
    setAuthState(AUTH_STATES.AUTHENTICATED);
    return response;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    setUser(response.data.user);
    setAuthState(AUTH_STATES.AUTHENTICATED);
    return response;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    setAuthState(AUTH_STATES.UNAUTHENTICATED);
  };

  const value = {
    user,
    authState,
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,
    isLoading: authState === AUTH_STATES.LOADING,
    login,
    register,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
