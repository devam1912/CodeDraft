import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Token helpers (in-memory variable fallback for incognito/cross-origin)
let inMemoryToken = null;

export const setStoredToken = (token) => {
  if (token) {
    inMemoryToken = token;
  }
};

export const getStoredToken = () => {
  return inMemoryToken;
};

export const clearStoredToken = () => {
  inMemoryToken = null;
};

// Attach Authorization header from localStorage on every request
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || "";
      if (
        !url.includes("/auth/login") &&
        !url.includes("/auth/register") &&
        !url.includes("/auth/me") &&
        !url.includes("/auth/logout")
      ) {
        clearStoredToken();
        window.location.href = "/login";
        return new Promise(() => {}); // Prevent component-level catches and toasts
      }
    }
    const message =
      error.response?.data?.message || "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);


export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
};

export const roomAPI = {
  createRoom: (data) => api.post("/rooms", data),
  getRoomDetails: (roomId) => api.get(`/rooms/${roomId}`),
  validateProblem: (roomId, data) => api.post(`/rooms/${roomId}/validate`, data, { timeout: 60000 }),
  submitProblem: (roomId, data) => api.post(`/rooms/${roomId}/problem`, data),
  rateProblem: (roomId, data) => api.post(`/rooms/${roomId}/rate`, data),
};

export const userAPI = {
  getLeaderboard: (params) => api.get("/users/leaderboard", { params }),
  getCollegeLeaderboard: () => api.get("/users/leaderboard/college"),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.patch("/users/profile", data),
  getProblemsCreated: (params) => api.get("/users/problems-created", { params }),
  getPublicProfile: (username) => api.get(`/profiles/${username}`),
  sendChallengeInvite: (username) => api.post(`/profiles/${username}/challenge`),
  updateAvatar: (avatar) => api.patch("/users/avatar", { avatar }),
  verifyCollege: (email) => api.post("/users/verify-college", { email }),
  searchUsers: (q) => api.get("/users/search", { params: { q } }),
  // Friends
  getFriends: () => api.get("/users/friends"),
  getFriendRequests: () => api.get("/users/friends/requests"),
  sendFriendRequest: (username) => api.post(`/users/friends/request/${username}`),
  acceptFriendRequest: (username) => api.post(`/users/friends/accept/${username}`),
  rejectFriendRequest: (username) => api.post(`/users/friends/reject/${username}`),
  removeFriend: (username) => api.delete(`/users/friends/${username}`),
  inviteFriendToBattle: (username, data) => api.post(`/users/friends/${username}/invite`, data),
  convertCode: (data) => api.post("/users/ai/convert", data),
  generateSolution: (data) => api.post("/users/ai/generate-solution", data),
};



export const matchAPI = {
  getMatchReplay: (roomId) => api.get(`/matches/${roomId}`),
  getMyMatchHistory: (params) => api.get("/matches/user/me", { params }),
};

export const notificationAPI = {
  getNotifications: (params) => api.get("/notifications", { params }),
  markAllRead: () => api.post("/notifications/read-all"),
  markOneRead: (notifId) => api.patch(`/notifications/${notifId}/read`),
};

export const adminAPI = {
  getTelemetry: () => api.get("/admin/telemetry"),
};

export default api;


