import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { roomAPI } from "../services/api";
import PlayerSlot from "../components/lobby/PlayerSlot";
import RoomLink from "../components/lobby/RoomLink";
import toast from "react-hot-toast";

function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
        setPlayers(response.data.players || []);
        setTeamA(response.data.teamA || []);
        setTeamB(response.data.teamB || []);
      } catch (err) {
        toast.error(err.message || "Failed to load lobby details");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("room:join", { roomId });

    socket.on("room:playerJoined", ({ player, currentPlayers, teamA: tA, teamB: tB }) => {
      setPlayers(currentPlayers);
      if (tA) setTeamA(tA);
      if (tB) setTeamB(tB);
      if (player && player._id !== user._id) {
        toast.success(`Competitor "${player.username}" entered the lobby!`);
      }
    });

    socket.on("room:teamUpdated", ({ teamA: tA, teamB: tB, players: ps }) => {
      if (tA) setTeamA(tA);
      if (tB) setTeamB(tB);
      if (ps) setPlayers(ps);
    });

    socket.on("room:countdown", ({ count }) => {
      setCountdown(count);
    });

    socket.on("room:ready", ({ problem }) => {
      setCountdown(null);
      toast.success("Battle started! Releasing problem statement...");
      navigate(`/room/${roomId}/battle`, { state: { problem } });
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      navigate("/dashboard");
    });

    return () => {
      socket.off("room:playerJoined");
      socket.off("room:teamUpdated");
      socket.off("room:countdown");
      socket.off("room:ready");
      socket.off("error");
    };
  }, [socket, room, roomId, navigate, user._id]);

  const handleStartBattle = () => {
    if (!socket || !canStart) return;
    socket.emit("room:start", { roomId });
  };

  const handleSwitchTeam = (targetTeam) => {
    if (!socket) return;
    socket.emit("room:switchTeam", { roomId, targetTeam });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary text-text-secondary font-mono animate-pulse text-sm">
        Connecting to room lobby...
      </div>
    );
  }

  if (!room) return null;

  const isCreator = user._id === room.creatorId._id || user._id === room.creatorId;
  const maxPlayers = room.battleFormat === "2v2" ? 4 : 2;
  const canStart = players.length >= maxPlayers;

  const getSlotPlayer = (index) => {
    return players[index] || null;
  };

  return (
    <div className="min-height-100vh flex flex-col bg-bg-primary font-sans text-text-primary relative">
      {countdown !== null && (
        <div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in select-none">
          <div className="flex flex-col items-center gap-6">
            <span className="text-xs font-bold tracking-widest text-secondary uppercase font-sans">
              Battle starting in
            </span>
            <div className="w-36 h-36 rounded-full border-4 border-primary flex items-center justify-center bg-bg-surface shadow-2xl animate-pulse-glow">
              <span className="text-6xl font-extrabold font-mono text-primary animate-scale">
                {countdown}
              </span>
            </div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
              Get ready to code
            </span>
          </div>
        </div>
      )}

      <header className="border-b border-border-default bg-bg-surface px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-150 text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Dashboard
          </button>
          <div className="h-4 w-px bg-border-default" />
          <span className="text-sm font-semibold text-secondary tracking-wide uppercase">
            Battle Lobby
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-success-muted border border-success text-xs font-semibold text-success font-mono">
            {players.length} / {maxPlayers} Players Joined
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col md:grid md:grid-cols-3 gap-6">
        <section className="col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Coding Arena Lobby
            </h1>
            <p className="text-sm text-text-secondary">
              Prepare yourself. Once the host launches, there's no going back.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Lobby Combatants
            </h3>
            {room.battleFormat === "2v2" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                      Team Alpha
                    </span>
                    {!teamA.some((p) => p && (p._id === user._id || p === user._id)) && teamA.length < 2 && (
                      <button
                        onClick={() => handleSwitchTeam("A")}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        type="button"
                      >
                        Join Alpha
                      </button>
                    )}
                  </div>
                  <PlayerSlot player={teamA[0] || null} teamLabel="Team A" />
                  <PlayerSlot player={teamA[1] || null} teamLabel="Team A" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">
                      Team Beta
                    </span>
                    {!teamB.some((p) => p && (p._id === user._id || p === user._id)) && teamB.length < 2 && (
                      <button
                        onClick={() => handleSwitchTeam("B")}
                        className="text-[10px] font-bold text-secondary hover:underline cursor-pointer"
                        type="button"
                      >
                        Join Beta
                      </button>
                    )}
                  </div>
                  <PlayerSlot player={teamB[0] || null} teamLabel="Team B" />
                  <PlayerSlot player={teamB[1] || null} teamLabel="Team B" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <PlayerSlot player={getSlotPlayer(0)} />
                <PlayerSlot player={getSlotPlayer(1)} />
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex flex-col gap-4 shadow-lg w-full">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border-default pb-2">
              Match details
            </h3>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Host:</span>
                <span className="font-semibold text-text-primary">
                  {room.creatorId?.username || "Host User"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Format:</span>
                <span className="font-semibold text-secondary uppercase">
                  {room.battleFormat} Battle
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Difficulty:</span>
                <span
                  className={`font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded ${
                    room.problem?.difficulty === "easy"
                      ? "bg-success-muted text-success"
                      : room.problem?.difficulty === "medium"
                      ? "bg-warning-muted text-warning"
                      : "bg-error-muted text-error"
                  }`}
                >
                  {room.problem?.difficulty || "Easy"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Time Limit:</span>
                <span className="font-semibold text-text-primary">
                  {room.problem?.timeLimit || 10} Minutes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Host Competing:</span>
                <span className="font-semibold text-text-primary">
                  {room.creatorCompeting ? "Yes (ELO Penalty)" : "No (Spectating)"}
                </span>
              </div>
            </div>
          </div>

          <RoomLink roomId={room.roomId} />

          <div className="flex flex-col gap-3 w-full mt-auto">
            {isCreator ? (
              <button
                onClick={handleStartBattle}
                disabled={!canStart}
                type="button"
                className={`w-full py-4 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-200 shadow-xl ${
                  canStart
                    ? "bg-primary text-text-primary hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                }`}
              >
                {canStart ? "Launch Battle Arena" : "Waiting for Competitors"}
              </button>
            ) : (
              <div className="bg-bg-surface/50 border border-border-default rounded-xl p-4 text-center text-xs text-text-secondary italic animate-pulse">
                ⏳ Waiting for host to launch the battle...
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Lobby;
