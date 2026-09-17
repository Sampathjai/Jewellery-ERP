import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Sparkles, Lock, Mail, Eye, EyeOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactiveBanner, setInactiveBanner] = useState(false);

  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if redirected due to inactivity
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reason') === 'inactive') {
      setInactiveBanner(true);
    }
  }, [location]);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMessage(res.message || 'Invalid email address or password.');
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 px-4 py-12 dark:bg-charcoal-950 relative overflow-y-auto">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 rounded-3xl border border-gold-400/40 bg-charcoal-900/95 p-8 shadow-2xl backdrop-blur relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <BrandLogo variant="icon" size="xl" className="mx-auto shadow-2xl border-2 border-gold-400" />
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-slate-100">
              Shankar Jewellery
            </h2>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-wider mt-1">
              Sign in to manage your jewellery business
            </p>
          </div>
        </div>

        {/* Inactivity Session Expiry Banner */}
        {inactiveBanner && (
          <div className="rounded-2xl border border-amber-400/50 bg-amber-950/60 p-4 text-xs text-amber-200 flex items-start gap-3 shadow-md">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-bold">Session Expired</strong>
              <span>Your session has expired due to 15 minutes of inactivity. Please log in again to continue.</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/50 bg-red-950/60 p-3 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-300">Email Address / Username</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sumathy@shankarjewellery.com or ramesh_counter"
                className="w-full min-h-[42px] rounded-xl border border-charcoal-700 bg-charcoal-800 py-2.5 pl-10 pr-3 text-xs text-slate-100 focus:border-gold-500 focus:outline-none placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[42px] rounded-xl border border-charcoal-700 bg-charcoal-800 py-2.5 pl-10 pr-10 text-xs text-slate-100 focus:border-gold-500 focus:outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-charcoal-700 bg-charcoal-800 text-gold-500 focus:ring-0"
              />
              Remember me on this device
            </label>
            <a href="/forgot-password" className="text-gold-400 hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="border-t border-charcoal-800 pt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-500" />
          <span>Shankar Jewellery ERP v1.0 • 15-Min Session Protection Active</span>
        </div>
      </div>
    </div>
  );
};
