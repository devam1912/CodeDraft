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

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
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
  validateProblem: (roomId, data) => api.post(`/rooms/${roomId}/validate`, data),
  submitProblem: (roomId, data) => api.post(`/rooms/${roomId}/problem`, data),
};

export const userAPI = {
  getLeaderboard: (params) => api.get("/users/leaderboard", { params }),
  getCollegeLeaderboard: () => api.get("/users/leaderboard/college"),
  getProfile: () => api.get("/users/profile"),
  getProblemsCreated: (params) => api.get("/users/problems-created", { params }),
  getPublicProfile: (username) => api.get(`/profiles/${username}`),
  sendChallengeInvite: (username) => api.post(`/profiles/${username}/challenge`),
};


export const tournamentAPI = {
  createTournament: (data) => api.post("/tournaments", data),
  getTournaments: () => api.get("/tournaments"),
  getTournamentDetails: (id) => api.get(`/tournaments/${id}`),
  registerForTournament: (id) => api.post(`/tournaments/${id}/register`),
  startTournament: (id) => api.post(`/tournaments/${id}/start`),
};

export const matchAPI = {
  getMatchReplay: (roomId) => api.get(`/matches/${roomId}`),
  getMyMatchHistory: (params) => api.get("/matches/user/me", { params }),
};

export default api;

