import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roomAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

function MatchReplay() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playbackTimerRef = useRef(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
        if (!response.data.eventTimeline || response.data.eventTimeline.length === 0) {
          toast.error("No telemetry records found for this match.");
          navigate("/dashboard");
        }
      } catch (err) {
        toast.error(err.message || "Failed to load match replay data");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate]);

  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentEventIdx((prev) => {
          if (prev >= room.eventTimeline.length - 1) {
            setIsPlaying(false);
            clearInterval(playbackTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, room]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary text-text-secondary font-mono animate-pulse text-sm">
        Loading match replay telemetry...
      </div>
    );
  }

  if (!room) return null;

  const timeline = room.eventTimeline || [];
  const activeEvent = timeline[currentEventIdx];

  const getReconstructedProgress = () => {
    const progress = {};
    for (let i = 0; i <= currentEventIdx; i++) {
      const ev = timeline[i];
      if (ev.eventType === "progress_updated") {
        progress[ev.userId] = ev.payload;
      }
    }
    return progress;
  };

  const getWinnerAtStep = () => {
    for (let i = 0; i <= currentEventIdx; i++) {
      const ev = timeline[i];
      if (ev.eventType === "match_finished") {
        return ev.userId;
      }
    }
    return null;
  };

  const getTimestampString = (isoStr) => {
    const date = new Date(isoStr);
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const renderEventLogText = (ev) => {
    const userObj = room.players.find((p) => (p._id || p) === ev.userId) || { username: "Spectator" };
    switch (ev.eventType) {
      case "match_started":
        return "⚔️ Duel started! Countdown finished, releasing problem arena.";
      case "progress_updated":
        return `⚡ ${userObj.username} passed ${ev.payload?.passedCount}/${ev.payload?.totalCount} visible examples.`;
      case "submission_attempt":
        return `✍️ ${userObj.username} submitted code in ${ev.payload?.language} (${
          ev.payload?.passed ? "Passed 100%" : "Failed hidden cases"
        }).`;
      case "match_finished":
        return `🏆 Match concluded! Winner: ${userObj.username}. ELO ratings updated.`;
      default:
        return "⚙️ System log updated.";
    }
  };

  const reconstructedProgress = getReconstructedProgress();
  const currentWinner = getWinnerAtStep();

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-sans text-text-primary overflow-hidden">
      <header className="border-b border-border-default bg-bg-surface px-6 py-4 flex items-center justify-between z-10">
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
            Match Telemetry Replay
          </span>
        </div>
        <div className="px-3 py-1 rounded bg-bg-elevated border border-border-default text-xs font-mono text-text-secondary">
          Room ID: {room.roomId}
        </div>
      </header>

      <main className="flex-1 flex grid grid-cols-1 md:grid-cols-3 overflow-hidden h-[calc(100vh-68px)]">
        <section className="col-span-2 flex flex-col border-r border-border-default overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight">Replay: {room.problem?.title}</h1>
              <p className="text-xs text-text-muted">
                Spectating past recordings of duel arena telemetry logs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {room.players.map((plyr, idx) => {
                const prog = reconstructedProgress[plyr._id] || { passedCount: 0, totalCount: room.problem?.visibleExamples?.length || 0 };
                const wonMatch = currentWinner === plyr._id;
                return (
                  <Card
                    key={plyr._id || idx}
                    className={`flex flex-col gap-3 p-5 bg-bg-surface border rounded-xl relative overflow-hidden transition-all duration-200 ${
                      wonMatch ? "border-success shadow-success-muted/5 shadow-2xl" : "border-border-default"
                    }`}
                  >
                    {wonMatch && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-success to-success-muted" />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-muted border border-primary flex items-center justify-center font-mono font-bold text-xs text-primary shadow-inner">
                          {plyr.avatar || plyr.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text-primary">{plyr.username}</h4>
                          <span className="text-[10px] text-text-muted font-mono uppercase">
                            ELO: {plyr.eloRating} | {plyr.college || "Independent Coder"}
                          </span>
                        </div>
                      </div>
                      {wonMatch && (
                        <div className="text-xs font-bold font-mono text-success uppercase animate-pulse">
                          🏆 Winner
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex justify-between font-mono text-[10px] text-text-secondary">
                        <span>Examples Solved:</span>
                        <span className="font-bold">{prog.passedCount} / {prog.totalCount}</span>
                      </div>
                      <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden border border-border-default">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{
                            width: `${(prog.passedCount / prog.totalCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="flex flex-col gap-3 p-5 bg-bg-surface border border-border-default rounded-xl">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border-default pb-2">
                Problem Description
              </h3>
              <div className="text-sm text-text-secondary leading-relaxed font-sans whitespace-pre-wrap">
                {room.problem?.statement}
              </div>
            </Card>
          </div>

          <div className="bg-bg-surface border-t border-border-default p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant={isPlaying ? "secondary" : "primary"}
                size="sm"
                className="font-bold uppercase tracking-wider px-5"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-[10px] font-mono text-text-secondary">
                  Step {currentEventIdx + 1} of {timeline.length}
                </span>
                <input
                  type="range"
                  min="0"
                  max={timeline.length - 1}
                  value={currentEventIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentEventIdx(Number(e.target.value));
                  }}
                  className="flex-1 accent-primary bg-bg-elevated border border-border-default rounded-full h-1.5 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden bg-bg-surface">
          <div className="px-5 py-4 border-b border-border-default bg-bg-elevated/40 text-xs font-bold text-text-secondary uppercase tracking-wider">
            Replay Event Timetable
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 font-mono text-xs">
            {timeline.slice(0, currentEventIdx + 1).map((ev, idx) => (
              <div
                key={ev._id || idx}
                className={`p-3 rounded-lg border leading-relaxed ${
                  idx === currentEventIdx
                    ? "bg-primary-muted/10 border-primary/40 text-text-primary font-bold shadow-md shadow-primary-muted/2"
                    : "bg-bg-elevated/40 border-border-default text-text-secondary opacity-75"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-text-muted mb-1">
                  <span>STEP #{idx + 1}</span>
                  <span>{getTimestampString(ev.timestamp)}</span>
                </div>
                <div>{renderEventLogText(ev)}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MatchReplay;
