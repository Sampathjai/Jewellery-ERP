import React from 'react';
import { AlertTriangle, Clock, LogOut, ShieldCheck } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-amber-400/50 bg-charcoal-900 p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center gap-3 border-b border-charcoal-800 pb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
            <Clock className="h-6 w-6 animate-pulse text-amber-400" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-100">
              Inactivity Session Warning
            </h3>
            <p className="text-xs text-amber-400 font-semibold">
              Shankar Jewellery Session Protection
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs text-amber-200 flex flex-col items-center justify-center text-center space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
            Auto-Logout Countdown
          </span>
          <span className="font-mono text-4xl font-bold text-amber-300">
            00:{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
          </span>
          <p className="text-[11px] text-slate-300">
            Your session has been idle. You will be logged out automatically to protect shop data.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onLogoutNow}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-charcoal-700 bg-charcoal-800 py-3 text-xs font-bold text-slate-300 hover:bg-charcoal-700"
          >
            <LogOut className="h-4 w-4 text-red-400" />
            Log Out Now
          </button>
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-95"
          >
            <ShieldCheck className="h-4 w-4" />
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

