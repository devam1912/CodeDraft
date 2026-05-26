import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { tournamentAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

function TournamentArena() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTournament = async () => {
    try {
      const response = await tournamentAPI.getTournamentDetails(id);
      setTournament(response.data);
    } catch (err) {
      toast.error(err.message || "Failed to load tournament standings");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
    const interval = setInterval(fetchTournament, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRegister = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const response = await tournamentAPI.registerForTournament(id);
      setTournament(response.data);
      toast.success("Successfully registered for the bracket draft!");
    } catch (err) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const response = await tournamentAPI.startTournament(id);
      setTournament(response.data);
      toast.success("Tournament rounds generated! Battle arena launched.");
    } catch (err) {
      toast.error(err.message || "Failed to launch tournament.");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary text-text-secondary font-mono animate-pulse text-sm">
        Retrieving bracket draft trees...
      </div>
    );
  }

  if (!tournament) return null;

  const isHost = tournament.creatorId?._id === user._id || tournament.creatorId === user._id;
  const isRegistered = tournament.participants.some((p) => p._id === user._id || p === user._id);
  const totalRounds = tournament.rounds?.length || 0;

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
            Tournament Arena
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              tournament.status === "draft"
                ? "bg-warning-muted text-warning"
                : tournament.status === "active"
                ? "bg-success-muted text-success animate-pulse"
                : "bg-primary-muted text-primary"
            }`}
          >
            {tournament.status === "draft" ? "Drafting" : tournament.status === "active" ? "Active Duel" : "Concluded"}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6 overflow-x-auto">
        <div className="flex flex-col gap-2 border-b border-border-default pb-4">
          <h1 className="text-3xl font-extrabold tracking-tight">{tournament.name}</h1>
          <p className="text-xs text-text-secondary">
            Created by: {tournament.creatorId?.username || "Host User"} | Registered Competitors: {tournament.participants?.length || 0}
          </p>
        </div>

        {tournament.status === "draft" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <section className="col-span-2 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Competitors Register Sheet
              </h3>
              <Card className="p-6 bg-bg-surface border border-border-default rounded-xl flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tournament.participants.map((plyr, idx) => (
                    <div
                      key={plyr._id || idx}
                      className="p-3 bg-bg-elevated/40 border border-border-default rounded-xl flex items-center gap-3 font-mono text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-muted border border-primary flex items-center justify-center font-bold text-[9px] text-primary">
                        {plyr.avatar || plyr.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary truncate max-w-[80px]">{plyr.username}</span>
                        <span className="text-[9px] text-text-muted">ELO: {plyr.eloRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Sign-up Actions Deck
              </h3>
              <Card className="p-6 bg-bg-surface border border-border-default rounded-xl flex flex-col gap-4">
                {!isRegistered ? (
                  <Button
                    className="w-full py-3 font-bold uppercase tracking-wider"
                    onClick={handleRegister}
                    disabled={actionLoading}
                  >
                    Register for Bracket Draft
                  </Button>
                ) : (
                  <div className="p-3 bg-success-muted/10 border border-success/30 rounded-xl text-center text-xs font-semibold text-success font-mono">
                    ✓ Registered for this draft tournament
                  </div>
                )}

                {isHost && (
                  <Button
                    variant="secondary"
                    className="w-full py-3 font-bold uppercase tracking-wider mt-2 border border-border-default bg-bg-elevated hover:bg-bg-elevated/80"
                    onClick={handleStartTournament}
                    disabled={actionLoading || tournament.participants.length < 2}
                  >
                    Generate Round 1 Matchups
                  </Button>
                )}
                {isHost && tournament.participants.length < 2 && (
                  <span className="text-[10px] text-error text-center font-mono">
                    (Minimum of 2 competitors needed to initialize)
                  </span>
                )}
              </Card>
            </section>
          </div>
        ) : (
          <div className="flex gap-8 items-start py-6 min-w-[800px] select-none">
            {tournament.rounds.map((round, rIdx) => (
              <div key={round.roundNumber} className="flex-1 flex flex-col gap-8">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-widest text-center border-b border-border-default pb-2">
                  Round {round.roundNumber}
                </div>

                <div className="flex flex-col gap-6 justify-around flex-1">
                  {round.matches.map((match, mIdx) => {
                    const isUserA = match.playerA?._id === user._id;
                    const isUserB = match.playerB?._id === user._id;
                    const isInvolved = isUserA || isUserB;
                    const hasFinished = match.winnerId !== null && match.winnerId !== undefined;

                    return (
                      <Card
                        key={match._id || mIdx}
                        className={`p-4 bg-bg-surface border flex flex-col gap-3 rounded-xl transition-all duration-200 ${
                          isInvolved && !hasFinished
                            ? "border-primary shadow-2xl shadow-primary-muted/2 animate-pulse-glow"
                            : hasFinished
                            ? "border-border-default/40 opacity-75"
                            : "border-border-default"
                        }`}
                      >
                        <div className="flex flex-col gap-2 font-mono text-xs">
                          <div className={`flex items-center justify-between p-1.5 rounded ${match.winnerId === match.playerA?._id ? "bg-success-muted/10 text-success" : "text-text-secondary"}`}>
                            <span className="font-semibold">{match.playerA?.username || "TBD"}</span>
                            <span className="text-[10px] text-text-muted">{match.playerA?.eloRating || ""}</span>
                          </div>

                          <div className="h-px bg-border-default" />

                          <div className={`flex items-center justify-between p-1.5 rounded ${match.winnerId === match.playerB?._id ? "bg-success-muted/10 text-success" : "text-text-secondary"}`}>
                            <span className="font-semibold">{match.playerB?.username || "TBD"}</span>
                            <span className="text-[10px] text-text-muted">{match.playerB?.eloRating || ""}</span>
                          </div>
                        </div>

                        {isInvolved && !hasFinished && match.roomId && (
                          <Button
                            size="sm"
                            className="w-full py-2 text-[10px] font-bold uppercase tracking-wider"
                            onClick={() => navigate(`/room/${match.roomId}`)}
                          >
                            Enter Arena Lobby
                          </Button>
                        )}

                        {hasFinished && match.roomId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full py-2 text-[10px] font-bold uppercase tracking-wider border border-border-default bg-bg-elevated/30"
                            onClick={() => navigate(`/room/${match.roomId}/replay`)}
                          >
                            Watch Replay Teleplay
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default TournamentArena;
