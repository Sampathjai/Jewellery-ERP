import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileQuestion,
  ShieldAlert,
  WifiOff,
  RefreshCw,
  LayoutDashboard,
  ArrowLeft,
  ShieldX,
} from 'lucide-react';

export type ErrorType = '404' | '500' | '401' | '403' | 'network';

interface ErrorPageProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  type = '500',
  title,
  message,
  onRetry,
}) => {
  const navigate = useNavigate();

  const getErrorDetails = () => {
    switch (type) {
      case '404':
        return {
          icon: FileQuestion,
          defaultTitle: '404 – Page Not Found',
          defaultMessage: "The page you're looking for doesn't exist or has been moved.",
          badge: '404 Error',
        };
      case '401':
        return {
          icon: ShieldAlert,
          defaultTitle: '401 – Session Expired or Unauthorized',
          defaultMessage: 'Your login session has expired. Please log in again to continue accessing the ERP.',
          badge: 'Authentication Required',
        };
      case '403':
        return {
          icon: ShieldX,
          defaultTitle: '403 – Access Denied',
          defaultMessage: 'You do not have administrative permission to view or manage this section.',
          badge: 'Admin Only Section',
        };
      case 'network':
        return {
          icon: WifiOff,
          defaultTitle: 'Network Connection Failure',
          defaultMessage: 'Unable to connect to the backend server. Please check your internet connection and try again.',
          badge: 'Connection Lost',
        };
      case '500':
      default:
        return {
          icon: AlertTriangle,
          defaultTitle: '500 – Something Went Wrong',
          defaultMessage: 'Something went wrong while processing your request. Please try again or return to the dashboard.',
          badge: 'System Error',
        };
    }
  };

  const details = getErrorDetails();
  const IconComponent = details.icon;

  return (
    <div className="flex h-full w-full min-h-[80vh] items-center justify-center p-4 bg-slate-50 dark:bg-charcoal-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-charcoal-800 dark:bg-charcoal-900 space-y-6 relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gold-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        {/* Branding Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 font-serif font-bold text-base text-charcoal-950 shadow-gold border-2 border-gold-300">
            SJ
          </div>
          <div className="text-left">
            <h1 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 leading-tight">
              Shankar Jewellery
            </h1>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider dark:text-gold-400">
              Gold & Silver Jewellery ERP
            </p>
          </div>
        </div>

        {/* Error Badge & Icon */}
        <div className="space-y-3 pt-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-gold-400 border border-gold-500/30 shadow-inner">
            <IconComponent className="h-10 w-10" />
          </div>

          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900 dark:bg-gold-950/60 dark:text-gold-300 border border-amber-300 dark:border-gold-800 uppercase tracking-wider">
            {details.badge}
          </span>

          <h2 className="font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
            {title || details.defaultTitle}
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {message || details.defaultMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onRetry ? (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200 dark:hover:bg-charcoal-700 transition-all active:scale-95"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-charcoal-700 dark:text-slate-400 dark:hover:bg-charcoal-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

