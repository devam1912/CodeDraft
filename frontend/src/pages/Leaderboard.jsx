import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: 15,
        };

        if (filterType === "college" && user?.college) {
          params.college = user.college;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await userAPI.getLeaderboard(params);
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || { currentPage: 1, totalPages: 1 });
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
    if (podiumUsers[1]) order.push({ user: podiumUsers[1], rank: 2, color: "border-text-secondary/40 text-text-secondary", bg: "bg-text-secondary/10" });
    if (podiumUsers[0]) order.push({ user: podiumUsers[0], rank: 1, color: "border-warning/40 text-warning", bg: "bg-warning/10" });
    if (podiumUsers[2]) order.push({ user: podiumUsers[2], rank: 3, color: "border-amber-700/40 text-amber-700", bg: "bg-amber-700/10" });
    return order;
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-sans text-text-primary">
      <header className="border-b border-border-default bg-bg-surface px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-150 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Dashboard
          </button>
          <div className="h-4 w-px bg-border-default" />
          <span className="text-sm font-semibold text-secondary tracking-wide uppercase">
            Leaderboard
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight">ELO League Standings</h1>
            <p className="text-sm text-text-secondary">
              See who sits at the top of the arena ranks.
            </p>
          </div>

          <div className="flex bg-bg-surface border border-border-default p-1 rounded-xl gap-1">
            <button
              onClick={() => handleFilterChange("global")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${
                filterType === "global"
                  ? "bg-primary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Global
            </button>
            <button
              onClick={() => handleFilterChange("college")}
              disabled={!user?.college}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${
                filterType === "college"
                  ? "bg-primary text-text-primary"
                  : !user?.college
                  ? "text-text-muted cursor-not-allowed opacity-50"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {user?.college ? `${user.college} League` : "No College Registered"}
            </button>
          </div>
        </div>

        <div className="w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search fighters by username..."
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-default text-sm placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors duration-150 font-mono"
          />
        </div>

        {isLoading ? (
          <div className="flex-1 py-20 flex justify-center text-sm font-mono text-text-secondary animate-pulse">
            Retrieving standings history records...
          </div>
        ) : users.length === 0 ? (
          <Card className="text-center py-16 text-text-secondary flex flex-col items-center gap-3">
            <span className="text-4xl">🏅</span>
            <h3 className="text-lg font-bold text-text-primary">No competitors found</h3>
            <p className="text-xs text-text-muted">
              Adjust your search criteria or register a college tag to broaden findings.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-8 animate-fade-in">
            {currentPage === 1 && !searchQuery && podiumUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mt-4">
                {getPodiumOrder().map(({ user: podUser, rank, color, bg }) => (
                  <Card
                    key={podUser._id}
                    className={`bg-bg-surface border flex flex-col items-center p-6 text-center gap-4 relative overflow-hidden ${
                      rank === 1 ? "md:py-10 border-primary md:order-none" : "border-border-default"
                    }`}
                  >
                    <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${rank === 1 ? "from-primary to-secondary" : rank === 2 ? "from-text-secondary to-text-secondary/50" : "from-amber-700 to-amber-800"}`} />
                    
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-bg-elevated border-2 border-border-default flex items-center justify-center font-mono font-extrabold text-lg text-primary shadow-inner">
                        {podUser.avatar || podUser.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 ${color} ${bg} flex items-center justify-center font-mono font-black text-xs`}>
                        {rank}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h4 className="font-extrabold text-base text-text-primary truncate max-w-[150px]">
                        {podUser.username}
                      </h4>
                      <span className="text-[10px] text-text-muted font-mono uppercase truncate max-w-[150px]">
                        {podUser.college || "Independent Coder"}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black font-mono text-secondary">
                        {podUser.eloRating}
                      </span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider font-mono">
                        Rating ELO
                      </span>
                    </div>

                    <div className="text-[10px] text-text-secondary font-mono flex gap-3 border-t border-border-default pt-3 w-full justify-center">
                      <span>W: <span className="text-success font-bold">{podUser.wins || 0}</span></span>
                      <span>L: <span className="text-error font-bold">{podUser.losses || 0}</span></span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {(listUsers.length > 0 || (podiumUsers.length > 0 && (currentPage > 1 || searchQuery))) && (
              <Card className="p-0 border border-border-default rounded-xl overflow-hidden bg-bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-default bg-bg-elevated/40 text-text-muted uppercase font-mono tracking-wider">
                        <th className="py-4 px-6 text-center font-bold">Rank</th>
                        <th className="py-4 px-6 font-bold">Competitor</th>
                        <th className="py-4 px-6 font-bold">College</th>
                        <th className="py-4 px-6 text-center font-bold">Wins</th>
                        <th className="py-4 px-6 text-center font-bold">Losses</th>
                        <th className="py-4 px-6 text-right font-bold">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default font-mono">
                      {(currentPage === 1 && !searchQuery ? listUsers : users).map((listUser, idx) => {
                        const rankNumber = (currentPage - 1) * 15 + (currentPage === 1 && !searchQuery ? idx + 4 : idx + 1);
                        return (
                          <tr
                            key={listUser._id}
                            className={`hover:bg-bg-elevated/20 transition-colors duration-150 ${
                              user?._id === listUser._id ? "bg-primary-muted/5 font-bold" : ""
                            }`}
                          >
                            <td className="py-4 px-6 text-center text-text-muted font-bold">
                              #{rankNumber}
                            </td>
                            <td className="py-4 px-6 font-sans">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center font-mono font-bold text-[10px] text-primary">
                                  {listUser.avatar || listUser.username.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-text-primary">
                                  {listUser.username}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-text-secondary">
                              {listUser.college || "Independent Coder"}
                            </td>
                            <td className="py-4 px-6 text-center text-success font-bold">
                              {listUser.wins || 0}
                            </td>
                            <td className="py-4 px-6 text-center text-error font-bold">
                              {listUser.losses || 0}
                            </td>
                            <td className="py-4 px-6 text-right text-secondary font-black text-sm">
                              {listUser.eloRating}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border-default text-xs font-mono">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-text-secondary">
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
          </div>
        )}
      </main>
    </div>
  );
}

export default Leaderboard;
