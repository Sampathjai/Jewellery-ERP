import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Sparkles,
  LogIn,
  Database,
  Heart,
  TrendingUp,
  Boxes,
  Users,
  Fingerprint,
} from 'lucide-react';
import { isWebAuthnSupported, authenticateWithPasskey } from '@/lib/webauthn';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactiveBanner, setInactiveBanner] = useState(false);
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const { login, loginWithProfile, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setPasskeySupported(isWebAuthnSupported());

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

  const handlePasskeySignIn = async () => {
    setErrorMessage(null);
    setIsAuthenticatingPasskey(true);
    try {
      const res = await authenticateWithPasskey();
      if (res.success && res.userProfile) {
        loginWithProfile(res.userProfile);
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(res.message || 'Passkey authentication failed.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Biometric authentication failed.');
    } finally {
      setIsAuthenticatingPasskey(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-gold-500 selection:text-charcoal-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Premium Luxury Background Layer with Ambient Glows & Bokeh Lights */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-charcoal-900 via-slate-950 to-black -z-20 pointer-events-none" />
      
      {/* Soft Ambient Gold Lights */}
      <div className="fixed -top-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-amber-500/10 blur-[140px] -z-10 pointer-events-none" />
      <div className="fixed top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-gold-500/15 blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed -bottom-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-amber-600/10 blur-[130px] -z-10 pointer-events-none" />

      {/* Subtle Bokeh Particles Pattern */}
      <div className="fixed inset-0 opacity-30 -z-10 pointer-events-none bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      {/* Main Responsive Grid Layout */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-between py-4 lg:py-6 relative z-10">
        
        {/* Top Header Security Indicator Bar */}
        <header className="w-full flex items-center justify-between sm:justify-end gap-3 text-[10px] sm:text-xs text-gold-200/80 font-medium pb-2 border-b border-gold-500/10">
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Secure</span>
          </div>
          <span className="text-gold-500/40">•</span>
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <Database className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Reliable</span>
          </div>
          <span className="text-gold-500/40">•</span>
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <Heart className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Always With You</span>
          </div>
        </header>

        {/* Center Container: Split Layout on Desktop, Single Column on Mobile */}
        <main className="w-full my-auto py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* DESKTOP LEFT SIDE: Brand Showcase & Feature Highlights */}
          <section className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
            {/* Logo Emblem & Main Brand Header */}
            <div className="space-y-4">
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gold-400/40 to-amber-500/20 blur-md" />
                <img
                  src="/brand/shankar-jewellery-logo.png"
                  alt="Shankar Jewellery Logo"
                  className="relative h-28 w-28 object-contain rounded-full border-2 border-gold-400/80 shadow-[0_0_30px_rgba(212,175,55,0.35)] bg-charcoal-900/90 p-1"
                />
              </div>

              <div>
                <h1 className="font-serif text-4xl xl:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-gold-300 to-amber-200">
                  SHANKAR JEWELLERY
                </h1>
                
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gold-400/80" />
                  <span className="font-serif text-lg font-bold tracking-[0.3em] text-gold-400">
                    E R P
                  </span>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gold-400/80" />
                </div>

                <p className="text-xs tracking-[0.25em] text-gold-200/90 font-semibold uppercase mt-2">
                  TRUST &bull; TRADITION &bull; TECHNOLOGY
                </p>
                <div className="text-gold-400 text-xs my-1">&bull; &#10022; &bull;</div>
                <p className="text-[11px] tracking-[0.2em] text-slate-400 font-medium uppercase">
                  FOR A BRIGHTER TOMORROW
                </p>
              </div>
            </div>

            {/* Desktop Hero Message */}
            <div className="space-y-3 pt-2">
              <h2 className="font-serif text-2xl xl:text-3xl font-bold text-slate-100 leading-tight">
                Jewellery Business <br />
                <span className="text-gold-400 italic">Simplified with Technology</span>
              </h2>
              <p className="text-xs xl:text-sm text-slate-400 max-w-lg leading-relaxed">
                Complete enterprise solution for Shankar Jewellery retail billing, 916 gold consignment issues, customer ledgers, and real-time metal rate tracking.
              </p>
            </div>

            {/* 4 Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2 max-w-lg">
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-gold-500/20 bg-charcoal-900/40 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Manage Sales</h3>
                  <p className="text-[10px] text-slate-400">POS & GST Billing</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl border border-gold-500/20 bg-charcoal-900/40 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Track Inventory</h3>
                  <p className="text-[10px] text-slate-400">Gold & Silver Weight</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl border border-gold-500/20 bg-charcoal-900/40 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Handle Wholesale</h3>
                  <p className="text-[10px] text-slate-400">Credit Consignment</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl border border-gold-500/20 bg-charcoal-900/40 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Secure & Reliable</h3>
                  <p className="text-[10px] text-slate-400">Passkey & WebAuthn</p>
                </div>
              </div>
            </div>

            {/* Quote Footer */}
            <div className="pt-2">
              <p className="font-serif italic text-xs text-gold-300/80">
                &ldquo; Tradition in Every Gram, Technology in Every Step &rdquo;
              </p>
            </div>
          </section>

          {/* RIGHT SIDE (OR CENTERED ON MOBILE): Mobile Brand Header & Luxury Login Card */}
          <section className="lg:col-span-6 flex flex-col items-center justify-center w-full max-w-md mx-auto">
            
            {/* MOBILE ONLY BRAND HEADER */}
            <div className="flex lg:hidden flex-col items-center text-center space-y-2 mb-6">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gold-400/30 blur-sm pointer-events-none" />
                <img
                  src="/brand/shankar-jewellery-logo.png"
                  alt="Shankar Jewellery Logo"
                  className="relative h-24 w-24 sm:h-28 sm:w-28 object-contain rounded-full border-2 border-gold-400/80 shadow-[0_0_25px_rgba(212,175,55,0.3)] bg-charcoal-900/90 p-1"
                />
              </div>

              <div className="space-y-1">
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-gold-300 to-amber-200">
                  SHANKAR JEWELLERY
                </h1>

                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1px] w-8 bg-gold-400/50" />
                  <span className="font-serif text-xs sm:text-sm font-bold tracking-[0.3em] text-gold-400">
                    E R P
                  </span>
                  <div className="h-[1px] w-8 bg-gold-400/50" />
                </div>

                <p className="text-[10px] sm:text-xs tracking-[0.2em] text-gold-200/90 font-semibold uppercase">
                  TRUST &bull; TRADITION &bull; TECHNOLOGY
                </p>
                <div className="text-gold-400 text-[10px] leading-none my-0.5">&bull; &#10022; &bull;</div>
                <p className="text-[9px] sm:text-[10px] tracking-[0.18em] text-slate-400 font-medium uppercase">
                  FOR A BRIGHTER TOMORROW
                </p>
              </div>
            </div>

            {/* LUXURY GLASSMORPHISM LOGIN CARD */}
            <div className="w-full rounded-3xl border border-gold-500/30 bg-charcoal-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.15)] relative overflow-hidden transition-all">
              
              {/* Top Card Golden Ambient Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

              {/* Card Header Title */}
              <div className="text-center space-y-1 mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Sign in to manage your jewellery business
                </p>
              </div>

              {/* Inactivity Session Expiry Banner */}
              {inactiveBanner && (
                <div className="mb-5 rounded-2xl border border-amber-400/50 bg-amber-950/70 p-3.5 text-xs text-amber-200 flex items-start gap-3 shadow-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300 font-bold">Session Expired</strong>
                    <span>Your session has expired due to inactivity. Please log in again to continue.</span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-5 rounded-2xl border border-red-500/60 bg-red-950/70 p-3.5 text-xs text-red-200 flex items-center gap-2.5 shadow-lg">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email / Username Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address or Username
                  </label>
                  <div className="relative rounded-xl border border-gold-500/20 bg-black/40 text-slate-100 focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400/50 transition-all">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gold-400/80 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email or username"
                      className="w-full min-h-[48px] bg-transparent py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative rounded-xl border border-gold-500/20 bg-black/40 text-slate-100 focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400/50 transition-all">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gold-400/80 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full min-h-[48px] bg-transparent py-3 pl-10 pr-12 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 bottom-0 px-3.5 text-slate-400 hover:text-gold-300 transition-colors flex items-center justify-center min-w-[48px] min-h-[48px]"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gold-500/40 bg-black/50 text-gold-500 focus:ring-0 focus:ring-offset-0 accent-gold-500 cursor-pointer"
                    />
                    <span>Remember me on this device</span>
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading || isAuthenticatingPasskey}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-charcoal-950 font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In to Dashboard</span>
                    </>
                  )}
                </button>
              </form>

              {/* Passkey Biometric Login Section */}
              {passkeySupported && (
                <div className="space-y-4 pt-4">
                  {/* OR Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gold-500/20" />
                    </div>
                    <div className="relative bg-charcoal-900/90 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      OR
                    </div>
                  </div>

                  {/* Passkey Button */}
                  <button
                    type="button"
                    onClick={handlePasskeySignIn}
                    disabled={isLoading || isAuthenticatingPasskey}
                    className="w-full min-h-[48px] rounded-xl border border-gold-500/40 bg-black/30 text-gold-200 font-semibold text-xs sm:text-sm hover:border-gold-400 hover:bg-gold-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-[0_0_15px_rgba(212,175,55,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthenticatingPasskey ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-gold-400" />
                    ) : (
                      <Fingerprint className="h-4 w-4 text-gold-400" />
                    )}
                    <span>
                      {isAuthenticatingPasskey
                        ? 'Verifying Touch ID / Face ID / Passkey...'
                        : 'Sign in with Passkey (Touch ID / Face ID)'}
                    </span>
                  </button>
                </div>
              )}

              {/* Bottom Security Active Indicator */}
              <div className="mt-6 pt-4 border-t border-gold-500/15 text-center text-[10px] sm:text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                <span>Shankar Jewellery ERP &bull; Session Protection & Passkey Security Active</span>
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Tagline / Footer */}
        <footer className="w-full flex items-center justify-center sm:justify-end pt-2 pb-1 text-right">
          <div className="text-center sm:text-right space-y-0.5">
            <p className="font-serif italic text-xs sm:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-200 to-gold-400">
              More Than Jewellery
            </p>
            <p className="font-serif italic text-xs sm:text-sm text-gold-400/90 font-medium tracking-wide">
              A Brighter Tomorrow
            </p>
            <div className="h-[1px] w-24 sm:ml-auto bg-gradient-to-l from-gold-400/60 to-transparent mt-0.5 mx-auto sm:mx-0" />
          </div>
        </footer>
      </div>
    </div>
  );
};
