import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { matchAPI } from "../services/api";
import toast from "react-hot-toast";

const PAGE = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#0a0a0f",
  color: "#f8fafc",
  fontFamily: "Inter, sans-serif",
};

const NAV = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 32px",
  borderBottom: "1px solid #1e1e2e",
  backdropFilter: "blur(12px)",
  backgroundColor: "rgba(10,10,15,0.85)",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const LOGO = {
  fontSize: "20px",
  fontWeight: 800,
  background: "linear-gradient(135deg,#6366f1,#22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const MAIN = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  maxWidth: "1100px",
  width: "100%",
  margin: "0 auto",
  padding: "32px 24px",
  gap: "24px",
};

const CARD = {
  backgroundColor: "#111118",
  border: "1px solid #1e1e2e",
  borderRadius: "12px",
  padding: "24px",
};

const PLAYER_CARD = {
  ...CARD,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  flex: 1,
};

const PLAYER_NAME = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#f8fafc",
};

const TRACK = {
  height: "8px",
  borderRadius: "4px",
  backgroundColor: "#1e1e2e",
  overflow: "hidden",
  marginTop: "4px",
};

const FILL = (pct, isWinner) => ({
  height: "100%",
  borderRadius: "4px",
  width: `${pct}%`,
  background: isWinner
    ? "linear-gradient(90deg,#10b981,#22d3ee)"
    : "linear-gradient(90deg,#6366f1,#22d3ee)",
  transition: "width 0.4s ease",
});

const EVENT_FEED = {
  ...CARD,
  width: "280px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  maxHeight: "360px",
  overflowY: "auto",
};

const EVENT_ITEM = (type) => ({
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "JetBrains Mono, monospace",
  backgroundColor:
    type === "match_finished"
      ? "rgba(16,185,129,0.12)"
      : type === "submission_attempt"
      ? "rgba(99,102,241,0.12)"
      : "rgba(30,30,46,0.6)",
  color:
    type === "match_finished"
      ? "#10b981"
      : type === "submission_attempt"
      ? "#a5b4fc"
      : "#94a3b8",
  border: "1px solid transparent",
  borderColor:
    type === "match_finished"
      ? "rgba(16,185,129,0.3)"
      : type === "submission_attempt"
      ? "rgba(99,102,241,0.3)"
      : "#1e1e2e",
});

const SCRUBBER_WRAP = {
  ...CARD,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const SPEED_BTN = (active) => ({
  padding: "4px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "JetBrains Mono, monospace",
  cursor: "pointer",
  border: "1px solid",
  borderColor: active ? "#6366f1" : "#1e1e2e",
  backgroundColor: active ? "rgba(99,102,241,0.15)" : "transparent",
  color: active ? "#a5b4fc" : "#64748b",
  transition: "all 0.15s",
});

const CTRL_BTN = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  border: "1px solid #1e1e2e",
  backgroundColor: "#111118",
  cursor: "pointer",
  color: "#f8fafc",
  transition: "background 0.15s",
};

function formatSec(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function describeEvent(event, players) {
  const player = players?.find((p) => p._id?.toString() === event.userId?.toString());
  const name = player?.username || "Player";

  switch (event.eventType) {
    case "match_started":
      return "⚔️ Battle started";
    case "progress_updated":
      return `📊 ${name} passed ${event.payload?.passedCount}/${event.payload?.totalCount}`;
    case "submission_attempt":
      return event.payload?.passed
        ? `✅ ${name} solved it!`
        : `❌ ${name} failed submission`;
    case "line_count_updated":
      return `⌨️ ${name} at ${event.payload?.lineCount} lines`;
    case "match_finished":
      return "🏆 Match finished";
    default:
      return `${event.eventType}`;
  }
}

function MatchReplay() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [replayData, setReplayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [playerStates, setPlayerStates] = useState({});

  const timeoutRef = useRef(null);
  const feedRef = useRef(null);

  useEffect(() => {
    const loadReplay = async () => {
      try {
        const data = await matchAPI.getMatchReplay(roomId);
        setReplayData(data);

        const initialStates = {};
        (data.players || []).forEach((p) => {
          initialStates[p._id?.toString()] = { passed: 0, total: 0, lineCount: 0 };
        });
        setPlayerStates(initialStates);
      } catch (err) {
        toast.error("Failed to load match replay");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    loadReplay();
    return () => clearTimeout(timeoutRef.current);
  }, [roomId]);

  const applyEventsUpTo = useCallback(
    (index, timeline, players) => {
      const events = [];
      const states = {};
      (players || []).forEach((p) => {
        states[p._id?.toString()] = { passed: 0, total: 0, lineCount: 0 };
      });

      for (let i = 0; i <= index && i < timeline.length; i++) {
        const ev = timeline[i];
        const uid = ev.userId?.toString();
        events.push(ev);
        if (ev.eventType === "progress_updated" && uid) {
          states[uid] = {
            ...states[uid],
            passed: ev.payload?.passedCount || 0,
            total: ev.payload?.totalCount || 0,
          };
        }
        if (ev.eventType === "line_count_updated" && uid) {
          states[uid] = { ...states[uid], lineCount: ev.payload?.lineCount || 0 };
        }
      }
      setVisibleEvents(events);
      setPlayerStates(states);
      setCurrentIndex(index);
    },
    []
  );

  const playFrom = useCallback(
    (startIndex) => {
      if (!replayData) return;
      const { eventTimeline, players } = replayData;
      if (startIndex >= eventTimeline.length) {
        setIsPlaying(false);
        return;
      }

      const scheduleNext = (idx) => {
        if (idx >= eventTimeline.length) {
          setIsPlaying(false);
          return;
        }

        const current = eventTimeline[idx];
        const next = eventTimeline[idx + 1];
        const delayMs = next
          ? Math.max(200, (new Date(next.timestamp) - new Date(current.timestamp)) / speed)
          : 0;

        applyEventsUpTo(idx, eventTimeline, players);

        timeoutRef.current = setTimeout(() => {
          scheduleNext(idx + 1);
        }, delayMs);
      };

      scheduleNext(startIndex);
    },
    [replayData, speed, applyEventsUpTo]
  );

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleEvents]);

  const handlePlayPause = () => {
    if (isPlaying) {
      clearTimeout(timeoutRef.current);
      setIsPlaying(false);
    } else {
      const start = currentIndex >= (replayData?.eventTimeline?.length || 0) - 1 ? 0 : currentIndex;
      setIsPlaying(true);
      playFrom(start);
    }
  };

  const handleScrub = (e) => {
    clearTimeout(timeoutRef.current);
    setIsPlaying(false);
    const idx = parseInt(e.target.value, 10);
    applyEventsUpTo(idx, replayData.eventTimeline, replayData.players);
  };

  const handleSpeedChange = (s) => {
    clearTimeout(timeoutRef.current);
    setIsPlaying(false);
    setSpeed(s);
  };

  const handleRestart = () => {
    clearTimeout(timeoutRef.current);
    setIsPlaying(false);
    applyEventsUpTo(0, replayData.eventTimeline, replayData.players);
  };

  if (isLoading) {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <div style={{ fontSize: "24px" }}>⏳</div>
        <div style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
          Loading match replay...
        </div>
      </div>
    );
  }

  if (!replayData) return null;

  const { players, eventTimeline, winnerId, eloChanges, problem } = replayData;
  const totalEvents = eventTimeline.length;
  const winnerIdStr = winnerId?._id?.toString() || winnerId?.toString() || null;

  const durationSec =
    replayData.startedAt && replayData.finishedAt
      ? Math.round((new Date(replayData.finishedAt) - new Date(replayData.startedAt)) / 1000)
      : null;

  return (
    <div style={PAGE}>
      <nav style={NAV}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Dashboard
          </button>
          <span style={{ color: "#1e1e2e" }}>|</span>
          <span style={LOGO}>Match Replay</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#64748b" }}>
          {problem?.title && (
            <span style={{ color: "#94a3b8" }}>{problem.title}</span>
          )}
          {durationSec !== null && (
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                backgroundColor: "#1e1e2e",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              ⏱ {formatSec(durationSec)}
            </span>
          )}
        </div>
      </nav>

      <main style={MAIN}>
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "16px", flex: 1 }}>
            {players.map((player) => {
              const uid = player._id?.toString();
              const state = playerStates[uid] || { passed: 0, total: 0, lineCount: 0 };
              const isWinner = winnerIdStr === uid;
              const pct = state.total > 0 ? Math.round((state.passed / state.total) * 100) : 0;
              const eloDelta = eloChanges?.[uid];

              return (
                <div key={uid} style={PLAYER_CARD}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(99,102,241,0.15)",
                          border: "1px solid rgba(99,102,241,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#a5b4fc",
                        }}
                      >
                        {player.avatar || player.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={PLAYER_NAME}>{player.username}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>ELO {player.eloRating}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {isWinner && (
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#10b981",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            backgroundColor: "rgba(16,185,129,0.1)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          Winner
                        </div>
                      )}
                      {eloDelta !== undefined && eloDelta !== null && (
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono, monospace",
                            color: eloDelta >= 0 ? "#10b981" : "#ef4444",
                            marginTop: "4px",
                          }}
                        >
                          {eloDelta >= 0 ? "+" : ""}{eloDelta}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "4px",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <span>Test Cases</span>
                      <span>
                        {state.passed}/{state.total > 0 ? state.total : "?"}
                      </span>
                    </div>
                    <div style={TRACK}>
                      <div style={FILL(pct, isWinner)} />
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    Lines written: {state.lineCount}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={EVENT_FEED} ref={feedRef}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                paddingBottom: "8px",
                borderBottom: "1px solid #1e1e2e",
              }}
            >
              Event Log
            </div>
            {visibleEvents.length === 0 && (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "16px 0" }}>
                Press play to start replay
              </div>
            )}
            {visibleEvents.map((ev, i) => (
              <div key={i} style={EVENT_ITEM(ev.eventType)}>
                {describeEvent(ev, players)}
              </div>
            ))}
          </div>
        </div>

        <div style={SCRUBBER_WRAP}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleRestart}
                style={CTRL_BTN}
                title="Restart"
              >
                ⏮
              </button>
              <button
                onClick={handlePlayPause}
                style={{ ...CTRL_BTN, backgroundColor: isPlaying ? "rgba(99,102,241,0.2)" : "#111118", width: "44px", height: "44px", fontSize: "16px" }}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            </div>

            <div
              style={{
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                color: "#64748b",
              }}
            >
              Event {Math.min(currentIndex + 1, totalEvents)} / {totalEvents}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", marginRight: "4px" }}>Speed</span>
              {[1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  style={SPEED_BTN(speed === s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, totalEvents - 1)}
            value={currentIndex}
            onChange={handleScrub}
            style={{
              width: "100%",
              accentColor: "#6366f1",
              cursor: "pointer",
              height: "6px",
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default MatchReplay;
