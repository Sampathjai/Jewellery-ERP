import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import {
  detectBiometricCapability,
  registerDeviceBiometricAndPin,
  validatePinComplexity,
  BiometricCapability,
} from '@/lib/biometricAuth';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Smartphone,
} from 'lucide-react';

interface BiometricSetupModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BiometricSetupModal: React.FC<BiometricSetupModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'prompt' | 'pin' | 'success'>('prompt');
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [customDeviceName, setCustomDeviceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      detectBiometricCapability().then((cap) => {
        setCapability(cap);
        setCustomDeviceName(
          cap.biometricType === 'touch_id'
            ? 'MacBook Touch ID'
            : cap.biometricType === 'face_id'
            ? 'Apple Face ID'
            : cap.biometricType === 'windows_hello'
            ? 'Windows Hello PC'
            : cap.biometricType === 'fingerprint'
            ? 'Android Fingerprint'
            : 'Jewellery ERP Device'
        );
      });
      setStep('prompt');
      setPin('');
      setConfirmPin('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSetup = () => {
    setErrorMsg(null);
    setStep('pin');
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate PIN
    const validation = validatePinComplexity(pin);
    if (!validation.valid) {
      setErrorMsg(validation.message || 'Invalid PIN.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('PIN and Confirm PIN do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerDeviceBiometricAndPin(user, pin, customDeviceName);
      if (res.success) {
        setStep('success');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Failed to register biometric device credential.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error configuring device security.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl border border-gold-500/35 bg-charcoal-900/95 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.25)] text-slate-100 overflow-hidden">
        
        {/* Top ambient gold accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500" />

        {/* Close Button */}
        {step !== 'success' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* STEP 1: INITIAL PROMPT */}
        {step === 'prompt' && (
          <div className="text-center space-y-4 pt-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400/20 to-amber-500/20 border border-gold-400/40 text-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.25)]">
              <Fingerprint className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
                Secure your Jewellery ERP
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Use {capability?.displayName || 'Face ID / Touch ID / Fingerprint'} to quickly and securely unlock this device without entering your password every time.
              </p>
            </div>

            <div className="rounded-xl border border-gold-500/20 bg-black/40 p-3.5 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100% On-Device Biometrics:</strong> Fingerprint and Face ID data never leave your device hardware.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Local PIN Fallback:</strong> Create a 6-digit ERP PIN to unlock if biometrics are unavailable.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartSetup}
                className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-charcoal-950 font-bold text-xs sm:text-sm shadow-gold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Fingerprint className="h-4 w-4" />
                <span>Enable Biometric Login</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 min-h-[46px] rounded-xl border border-slate-700 bg-white/5 text-slate-300 font-semibold text-xs hover:bg-white/10 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PIN SETUP */}
        {step === 'pin' && (
          <form onSubmit={handleCompleteSetup} className="space-y-4 pt-1">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                Create your ERP PIN
              </h3>
              <p className="text-xs text-slate-300">
                This 6-digit PIN will be used if biometric unlock is unavailable or fails.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-500/60 bg-red-950/70 p-3 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* PIN input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full min-h-[46px] rounded-xl border border-gold-500/30 bg-black/60 px-4 text-center font-mono text-xl tracking-[0.4em] text-gold-300 placeholder:text-slate-600 focus:border-gold-400 focus:outline-none"
                />
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full min-h-[46px] rounded-xl border border-gold-500/30 bg-black/60 px-4 text-center font-mono text-xl tracking-[0.4em] text-gold-300 placeholder:text-slate-600 focus:border-gold-400 focus:outline-none"
                />
              </div>

              {/* Device Nickname */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Device Name
                </label>
                <div className="relative rounded-xl border border-gold-500/30 bg-black/40">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gold-400/80 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    placeholder="e.g. MacBook Touch ID"
                    className="w-full min-h-[42px] bg-transparent py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('prompt')}
                disabled={isLoading}
                className="w-1/3 min-h-[44px] rounded-xl border border-slate-700 bg-white/5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isLoading || pin.length !== 6 || confirmPin.length !== 6}
                className="w-2/3 min-h-[44px] rounded-xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-charcoal-950 font-bold text-xs shadow-gold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>Save PIN & Enable</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="text-center space-y-3 py-6 animate-fadeIn">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-white">
              Biometric & PIN Login Enabled!
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Your device has been securely registered. Next time you open Shankar Jewellery ERP, you can unlock with {capability?.displayName || 'Biometrics'} or your 6-digit PIN.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
