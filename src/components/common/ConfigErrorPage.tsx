import React from 'react';
import { Database, AlertTriangle, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

interface ConfigErrorPageProps {
  onContinueDemo?: () => void;
}

export const ConfigErrorPage: React.FC<ConfigErrorPageProps> = ({ onContinueDemo }) => {
  return (
    <div className="flex h-full w-full min-h-[85vh] items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-gold-400/40 bg-charcoal-900/95 p-8 text-center shadow-2xl backdrop-blur space-y-6 relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 font-serif font-bold text-xl text-charcoal-950 shadow-gold border-2 border-gold-300">
            SJ
          </div>
          <div className="text-left">
            <h1 className="font-serif text-lg font-bold text-slate-100 leading-tight">
              Shankar Jewellery
            </h1>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-wider">
              Gold & Silver Jewellery ERP
            </p>
          </div>
        </div>

        {/* Warning Badge & Icon */}
        <div className="space-y-3 pt-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-gold-500/30 shadow-inner">
            <Database className="h-8 w-8 text-gold-400" />
          </div>

          <span className="inline-block rounded-full bg-amber-950/80 px-3.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/40 uppercase tracking-wider">
            Vercel Environment Setup Required
          </span>

          <h2 className="font-serif text-2xl font-bold text-slate-100">
            Supabase Credentials Not Configured
          </h2>

          <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
            The ERP application is running in production mode, but valid Supabase environment variables were not found in your Vercel Project Settings.
          </p>
        </div>

        {/* Environment Variable Table Box */}
        <div className="rounded-2xl border border-charcoal-700 bg-charcoal-800/90 p-4 text-left space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans font-bold uppercase tracking-wider border-b border-charcoal-700 pb-2">
            <span>Vercel Environment Variable</span>
            <span>Required Value</span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-200">
              <span className="text-gold-400 font-bold">VITE_SUPABASE_URL</span>
              <span className="text-slate-400 text-[11px] truncate">https://your-project.supabase.co</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-200">
              <span className="text-gold-400 font-bold">VITE_SUPABASE_ANON_KEY</span>
              <span className="text-slate-400 text-[11px] truncate">your-actual-supabase-anon-key</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-left text-xs text-slate-400 space-y-1.5 pt-1 font-sans">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gold-500" />
            How to configure on Vercel:
          </div>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-400">
            <li>Go to <strong>Vercel Dashboard → Your Project → Settings → Environment Variables</strong>.</li>
            <li>Add <code className="text-gold-300">VITE_SUPABASE_URL</code> and <code className="text-gold-300">VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Redeploy your Vercel project.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>

          {onContinueDemo && (
            <button
              onClick={onContinueDemo}
              className="flex items-center gap-2 rounded-xl border border-charcoal-700 bg-charcoal-800 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-charcoal-700 transition-all active:scale-95"
            >
              <Layers className="h-4 w-4 text-gold-500" />
              Continue in Local ERP Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
