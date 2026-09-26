import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { UserProfile } from '@/types';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  LogIn,
  Database,
  Heart,
  TrendingUp,
  Boxes,
  Users,
  Fingerprint,
  KeyRound,
  ArrowLeft,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import {
  detectBiometricCapability,
  unlockWithBiometrics,
  unlockWithPin,
  getLocalDeviceVault,
  hasRegisteredLocalDevice,
  checkPinLockout,
  LocalDeviceVault,
  BiometricCapability,
} from '@/lib/biometricAuth';
import { BiometricSetupModal } from '@/components/auth/BiometricSetupModal';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactiveBanner, setInactiveBanner] = useState(false);

  // Biometric & PIN Unlock State
  const [loginMode, setLoginMode] = useState<'biometric' | 'pin' | 'password'>('password');
  const [deviceVault, setDeviceVault] = useState<LocalDeviceVault | null>(null);
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [pin, setPin] = useState('');
  const [isAuthenticatingBiometric, setIsAuthenticatingBiometric] = useState(false);
  const [isAuthenticatingPin, setIsAuthenticatingPin] = useState(false);
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState(0);

  // First Login Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);

  const { login, loginWithProfile, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Detect biometric hardware and local registered device vault
    detectBiometricCapability().then((cap) => setCapability(cap));
    const vault = getLocalDeviceVault();
    if (vault) {
      setDeviceVault(vault);
      setLoginMode('biometric');
    } else {
      setLoginMode('password');
    }

    // Check PIN lockout on load
    const lockout = checkPinLockout();
    if (lockout.isLocked) {
      setPinLockoutSeconds(lockout.remainingSeconds);
    }

    // Check if redirected due to inactivity
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reason') === 'inactive') {
      setInactiveBanner(true);
    }
  }, [location]);

  // Lockout countdown timer
  useEffect(() => {
    if (pinLockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setPinLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pinLockoutSeconds]);

  useEffect(() => {
    // If user is already logged in and setup modal is not active, redirect to dashboard
    if (user && !isLoading && !showSetupModal) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate, showSetupModal]);

  // Handle Standard Password Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      // Check if device is already registered
      if (!hasRegisteredLocalDevice() && res.userProfile) {
        setPendingUser(res.userProfile);
        setShowSetupModal(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setErrorMessage(res.message || 'Invalid email address or password.');
    }
  };

  // Handle Biometric Unlock (Face ID, Touch ID, Windows Hello, Fingerprint)
  const handleBiometricUnlock = async () => {
    setErrorMessage(null);
    setIsAuthenticatingBiometric(true);

    try {
      const res = await unlockWithBiometrics();
      if (res.success && res.userProfile) {
        loginWithProfile(res.userProfile);
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(res.message || 'Biometric authentication failed. Please enter your ERP PIN.');
        // Offer PIN fallback automatically
        setLoginMode('pin');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Biometric unlock failed. Please use your PIN.');
      setLoginMode('pin');
    } finally {
      setIsAuthenticatingBiometric(false);
    }
  };

  // Handle PIN Unlock
  const handlePinUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 6) {
      setErrorMessage('Please enter your full 6-digit ERP PIN.');
      return;
    }

    setErrorMessage(null);
    setIsAuthenticatingPin(true);

    try {
      const res = await unlockWithPin(pin);
      if (res.success && res.userProfile) {
        loginWithProfile(res.userProfile);
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(res.message || 'Incorrect PIN.');
        setPin('');
        if (res.remainingSeconds) {
          setPinLockoutSeconds(res.remainingSeconds);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'PIN unlock failed.');
      setPin('');
    } finally {
      setIsAuthenticatingPin(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden lg:overflow-hidden selection:bg-gold-500 selection:text-charcoal-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Background Decorative Ambient Layer */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-charcoal-900 via-slate-950 to-black -z-20 pointer-events-none" />
      <div className="fixed -top-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-amber-500/10 blur-[140px] -z-10 pointer-events-none" />
      <div className="fixed top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-gold-500/15 blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed -bottom-32 left-1/3 h-[28rem] w-[28rem] rounded-full bg-amber-600/10 blur-[140px] -z-10 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-between py-3 lg:py-4 relative z-10">
        
        {/* Top Header Security Indicator Bar */}
        <header className="w-full flex items-center justify-between sm:justify-end gap-3 text-[11px] sm:text-xs text-gold-200/80 font-medium pb-2 border-b border-gold-500/15 shrink-0">
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Secure Biometrics & PIN Active</span>
          </div>
          <span className="text-gold-500/30">•</span>
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <Database className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Reliable</span>
          </div>
          <span className="text-gold-500/30">•</span>
          <div className="flex items-center gap-1.5 hover:text-gold-300 transition-colors">
            <Heart className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span>Always With You</span>
          </div>
        </header>

        {/* Center Container: 2-Column Split on Desktop */}
        <main className="w-full my-auto py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* DESKTOP LEFT SIDE: Brand Showcase & Feature Highlights */}
          <section className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-5 pr-2">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-gold-400/50 to-amber-500/30 blur-md pointer-events-none" />
                  <img
                    src="/brand/shankar-jewellery-logo.png"
                    alt="Shankar Jewellery Logo"
                    className="relative h-20 w-20 xl:h-24 xl:w-24 object-contain rounded-full border-2 border-gold-400/90 shadow-[0_0_25px_rgba(212,175,55,0.35)] bg-charcoal-900/95 p-1"
                  />
                </div>

                <div>
                  <h1 className="font-serif text-3xl xl:text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-gold-300 to-amber-200 leading-tight">
                    SHANKAR JEWELLERY
                  </h1>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-[1px] w-8 bg-gold-400/60" />
                    <span className="font-serif text-xs font-bold tracking-[0.3em] text-gold-400">
                      E R P
                    </span>
                    <div className="h-[1px] w-8 bg-gold-400/60" />
                  </div>

                  <p className="text-[10px] xl:text-xs tracking-[0.2em] text-gold-200/90 font-semibold uppercase mt-1">
                    TRUST &bull; TRADITION &bull; TECHNOLOGY
                  </p>
                  <p className="text-[9px] xl:text-[10px] tracking-[0.18em] text-slate-400 font-medium uppercase mt-0.5">
                    FOR A BRIGHTER TOMORROW
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <h2 className="font-serif text-xl xl:text-2xl font-bold text-slate-100 leading-snug">
                Enterprise Jewellery Management Platform
              </h2>
              <p className="text-xs xl:text-sm text-slate-300 font-light leading-relaxed">
                Seamlessly orchestrate bullion rates, retail POS counter sales, wholesale credit ledgers, inventory, and staff roles from a single cloud system.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-gold-500/20 bg-charcoal-900/60 p-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-gold-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-serif text-xs font-bold">Live Rates</span>
                </div>
                <p className="text-[11px] text-slate-400">Chennai Bullion Ticker</p>
              </div>

              <div className="rounded-2xl border border-gold-500/20 bg-charcoal-900/60 p-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-gold-400 mb-1">
                  <Boxes className="h-4 w-4" />
                  <span className="font-serif text-xs font-bold">Inventory</span>
                </div>
                <p className="text-[11px] text-slate-400">Gross & Net Weight</p>
              </div>

              <div className="rounded-2xl border border-gold-500/20 bg-charcoal-900/60 p-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-gold-400 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="font-serif text-xs font-bold">Wholesale</span>
                </div>
                <p className="text-[11px] text-slate-400">Consignment Ledger</p>
              </div>
            </div>
          </section>

          {/* RIGHT SIDE: AUTHENTICATION CARD */}
          <section className="col-span-1 lg:col-span-6 w-full max-w-md mx-auto">
            
            {/* Mobile Branding Emblem */}
            <div className="flex lg:hidden flex-col items-center justify-center space-y-2 mb-4 text-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gold-400/30 blur-md pointer-events-none" />
                <img
                  src="/brand/shankar-jewellery-logo.png"
                  alt="Shankar Jewellery Logo"
                  className="relative h-16 w-16 object-contain rounded-full border border-gold-400/80 shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-charcoal-900 p-1"
                />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-gold-300 to-amber-200">
                  SHANKAR JEWELLERY ERP
                </h1>
                <p className="text-[9px] tracking-[0.16em] text-slate-400 font-medium uppercase pt-0.5">
                  FOR A BRIGHTER TOMORROW
                </p>
              </div>
            </div>

            {/* LUXURY GLASSMORPHISM AUTHENTICATION CARD */}
            <div className="w-full rounded-3xl border border-gold-500/35 bg-charcoal-900/85 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.2)] relative overflow-hidden transition-all">
              
              {/* Top Golden Ambient Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

              {/* Inactivity Session Expiry Banner */}
              {inactiveBanner && (
                <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-950/70 p-3 text-xs text-amber-200 flex items-start gap-2.5 shadow-md">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300 font-bold">Session Expired</strong>
                    <span>Your session has expired due to inactivity. Please log in again to continue.</span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/70 p-3 text-xs text-red-200 flex items-center gap-2 shadow-md">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MODE 1: BIOMETRIC UNLOCK */}
              {/* ------------------------------------------------------------- */}
              {loginMode === 'biometric' && deviceVault && (
                <div className="space-y-5 text-center">
                  <div className="space-y-1 mb-2">
                    <h2 className="font-serif text-2xl font-bold text-white tracking-wide">
                      Welcome Back
                    </h2>
                    <p className="text-xs text-gold-300 font-medium">
                      {deviceVault.userFullName || deviceVault.userEmail}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                      <Smartphone className="h-3 w-3 text-gold-400" />
                      <span>{deviceVault.deviceName}</span>
                    </p>
                  </div>

                  {/* Primary Biometric Button */}
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={handleBiometricUnlock}
                      disabled={isAuthenticatingBiometric}
                      className="group relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400/20 via-amber-500/20 to-gold-600/30 border-2 border-gold-400/70 shadow-[0_0_35px_rgba(212,175,55,0.35)] hover:border-gold-300 hover:shadow-[0_0_45px_rgba(212,175,55,0.55)] active:scale-95 transition-all cursor-pointer"
                      title={capability?.buttonLabel || 'Unlock with Biometrics'}
                    >
                      {isAuthenticatingBiometric ? (
                        <RefreshCw className="h-10 w-10 text-gold-300 animate-spin" />
                      ) : (
                        <Fingerprint className="h-11 w-11 text-gold-400 group-hover:text-gold-200 transition-colors" />
                      )}
                    </button>
                    <p className="mt-3 text-xs sm:text-sm font-bold text-gold-200">
                      {isAuthenticatingBiometric
                        ? 'Verifying Biometric Sensor...'
                        : capability?.buttonLabel || 'Unlock with Biometrics'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Touch sensor or look at screen to unlock
                    </p>
                  </div>

                  {/* Fallback Options */}
                  <div className="space-y-2 pt-2 border-t border-gold-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setLoginMode('pin');
                      }}
                      className="w-full min-h-[44px] rounded-xl border border-gold-500/30 bg-black/40 text-gold-200 font-semibold text-xs hover:bg-gold-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Lock className="h-3.5 w-3.5 text-gold-400" />
                      <span>Use PIN instead</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setLoginMode('password');
                      }}
                      className="w-full text-xs text-slate-400 hover:text-gold-300 transition-colors py-1"
                    >
                      Sign in with Password instead
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MODE 2: PIN UNLOCK */}
              {/* ------------------------------------------------------------- */}
              {loginMode === 'pin' && deviceVault && (
                <div className="space-y-4 text-center">
                  <div className="space-y-1 mb-1">
                    <h2 className="font-serif text-2xl font-bold text-white tracking-wide">
                      Enter ERP PIN
                    </h2>
                    <p className="text-xs text-gold-300 font-medium">
                      {deviceVault.userFullName || deviceVault.userEmail}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Enter your 6-digit local ERP PIN to unlock
                    </p>
                  </div>

                  {pinLockoutSeconds > 0 ? (
                    <div className="rounded-xl border border-red-500/50 bg-red-950/60 p-4 text-xs text-red-200 space-y-1">
                      <p className="font-bold">PIN Lockout Active</p>
                      <p>
                        Too many failed attempts. Try again in{' '}
                        <strong className="text-white font-mono">{pinLockoutSeconds}s</strong>
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePinUnlock} className="space-y-4">
                      {/* 6-Digit PIN Display & Input */}
                      <div>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          required
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setPin(val);
                            if (val.length === 6) {
                              // Auto trigger when 6 digits entered
                              setTimeout(() => {
                                unlockWithPin(val).then((res) => {
                                  if (res.success && res.userProfile) {
                                    loginWithProfile(res.userProfile);
                                    navigate('/dashboard', { replace: true });
                                  } else {
                                    setErrorMessage(res.message || 'Incorrect PIN.');
                                    setPin('');
                                    if (res.remainingSeconds) setPinLockoutSeconds(res.remainingSeconds);
                                  }
                                }).catch((err) => {
                                  setErrorMessage(err?.message || 'PIN unlock failed.');
                                  setPin('');
                                });
                              }, 100);
                            }
                          }}
                          placeholder="• • • • • •"
                          className="w-full min-h-[52px] rounded-2xl border-2 border-gold-500/50 bg-black/60 px-4 text-center font-mono text-2xl tracking-[0.5em] text-gold-300 placeholder:text-slate-600 focus:border-gold-400 focus:outline-none shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthenticatingPin || pin.length !== 6}
                        className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-charcoal-950 font-bold text-xs sm:text-sm shadow-gold hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isAuthenticatingPin ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Verifying PIN...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>Unlock with PIN</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Switch to Biometrics or Password */}
                  <div className="space-y-2 pt-2 border-t border-gold-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setLoginMode('biometric');
                      }}
                      className="w-full min-h-[44px] rounded-xl border border-gold-500/30 bg-black/40 text-gold-200 font-semibold text-xs hover:bg-gold-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Fingerprint className="h-3.5 w-3.5 text-gold-400" />
                      <span>Use {capability?.displayName || 'Biometrics'} instead</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setLoginMode('password');
                      }}
                      className="w-full text-xs text-slate-400 hover:text-gold-300 transition-colors py-1"
                    >
                      Sign in with Password instead
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MODE 3: STANDARD PASSWORD LOGIN */}
              {/* ------------------------------------------------------------- */}
              {loginMode === 'password' && (
                <div>
                  <div className="text-center space-y-1 mb-5">
                    <h2 className="font-serif text-2xl font-bold text-white tracking-wide">
                      Sign In with Password
                    </h2>
                    <p className="text-xs text-slate-400">
                      Sign in with your Shankar Jewellery credentials
                    </p>
                  </div>

                  {deviceVault && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setLoginMode('biometric');
                        }}
                        className="w-full py-2.5 px-3 rounded-xl border border-gold-500/40 bg-gold-500/10 text-xs font-semibold text-gold-300 hover:bg-gold-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to {deviceVault.deviceName} Unlock</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email / Username Field */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Address or Username
                      </label>
                      <div className="relative rounded-xl border border-gold-500/30 bg-black/50 text-slate-100 focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400/60 transition-all">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gold-400/90 pointer-events-none" />
                        <input
                          type="text"
                          required
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter email or username"
                          className="w-full min-h-[48px] bg-transparent py-3 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Password
                      </label>
                      <div className="relative rounded-xl border border-gold-500/30 bg-black/50 text-slate-100 focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400/60 transition-all">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gold-400/90 pointer-events-none" />
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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-0.5">
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
                      disabled={isLoading}
                      className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-charcoal-950 font-bold text-xs sm:text-sm shadow-[0_4px_25px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              )}

              {/* Bottom Security Active Indicator */}
              <div className="mt-5 pt-3.5 border-t border-gold-500/15 text-center text-[10px] sm:text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                <span>Device Biometric & PIN Security Protection Active</span>
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Tagline / Footer */}
        <footer className="w-full flex items-center justify-center sm:justify-end pt-1 pb-1 text-right shrink-0">
          <div className="text-center sm:text-right space-y-0.5">
            <p className="font-serif italic text-xs sm:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-200 to-gold-400">
              More Than Jewellery
            </p>
            <p className="font-serif italic text-xs sm:text-sm text-gold-400/90 font-medium tracking-wide">
              A Brighter Tomorrow
            </p>
            <div className="h-[1px] w-20 sm:ml-auto bg-gradient-to-l from-gold-400/60 to-transparent mt-0.5 mx-auto sm:mx-0" />
          </div>
        </footer>
      </div>

      {/* Post-Login Biometric & PIN Setup Modal */}
      {pendingUser && (
        <BiometricSetupModal
          user={pendingUser}
          isOpen={showSetupModal}
          onClose={() => {
            setShowSetupModal(false);
            navigate('/dashboard', { replace: true });
          }}
          onSuccess={() => {
            setShowSetupModal(false);
            navigate('/dashboard', { replace: true });
          }}
        />
      )}
    </div>
  );
};
