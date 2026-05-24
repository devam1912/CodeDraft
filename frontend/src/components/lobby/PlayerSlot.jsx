import React from "react";

function PlayerSlot({ player, teamLabel }) {
  if (!player) {
    return (
      <div className="border border-dashed border-border-default rounded-2xl p-5 flex items-center justify-center bg-bg-surface/30 h-28 w-full animate-pulse font-sans">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="w-8 h-8 rounded-full border border-dashed border-border-default flex items-center justify-center text-text-muted">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className="text-xs font-medium text-text-muted mt-1">
            Waiting for competitor...
          </span>
        </div>
      </div>
    );
  }

  const avatarInitials = player.avatar || (player.username ? player.username.slice(0, 2).toUpperCase() : "??");

  return (
    <div className="bg-bg-surface border border-border-default rounded-2xl p-5 flex items-center justify-between shadow-md hover:border-primary transition-all duration-200 h-28 w-full font-sans animate-fade-in relative overflow-hidden group">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-muted border-2 border-primary flex items-center justify-center text-primary font-bold text-lg font-sans shadow-lg group-hover:scale-105 transition-transform duration-200">
          {avatarInitials}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-text-primary tracking-tight truncate max-w-[140px]">
            {player.username}
          </span>
          {player.college ? (
            <span className="px-2 py-0.5 rounded-lg bg-bg-elevated border border-border-default text-[10px] text-text-secondary font-medium w-fit truncate max-w-[140px]">
              🏛️ {player.college}
            </span>
          ) : (
            <span className="text-[10px] text-text-muted italic">No College Set</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
            ELO Rating
          </span>
          <span className="text-xl font-bold tracking-tight text-secondary font-mono">
            {player.eloRating}
          </span>
        </div>
        {teamLabel && (
          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
              teamLabel === "Team A"
                ? "bg-primary-muted text-primary border border-primary/20"
                : "bg-secondary-muted text-secondary border border-secondary/20"
            }`}
          >
            {teamLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default PlayerSlot;
