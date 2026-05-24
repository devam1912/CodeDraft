import React, { useState } from "react";
import toast from "react-hot-toast";

function RoomLink({ roomId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    toast.success("Room invitation link copied to clipboard!");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex flex-col gap-3 shadow-lg max-w-md w-full font-sans">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
          Invite Competitors
        </span>
        <span className="text-xs text-text-muted">
          Share this unique link or room ID for others to join.
        </span>
      </div>

      <div className="flex items-center gap-2 bg-bg-primary border border-border-default rounded-xl p-2 pl-4 w-full">
        <span className="font-mono text-base font-bold tracking-widest text-secondary flex-1 select-all">
          {roomId}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="bg-primary text-text-primary px-4 py-2 rounded-lg text-xs font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-150 flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4 text-text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 text-text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v.75m-12 1.5h12m-12 3h12m-12 3h12"
                />
              </svg>
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RoomLink;
