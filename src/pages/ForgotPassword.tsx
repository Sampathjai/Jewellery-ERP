import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 px-4 py-12 dark:bg-charcoal-950 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl border border-gold-500/30 bg-charcoal-900 p-8 shadow-2xl">
        <Link to="/login" className="flex items-center gap-1.5 text-xs text-gold-400 mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
            <h3 className="font-serif text-xl font-bold text-slate-100">Reset Email Sent</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Password reset instructions have been sent to <strong>{email}</strong>. Please check your inbox.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-serif text-2xl font-bold text-slate-100">Reset Password</h2>
            <p className="mt-1 text-xs text-slate-400">Enter your registered email to receive a password reset link.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@sampathjewellery.com"
                    className="w-full rounded-xl border border-charcoal-700 bg-charcoal-800 py-2.5 pl-10 pr-3 text-xs text-slate-100 focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gold-500 py-3 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                Send Password Reset Link
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

