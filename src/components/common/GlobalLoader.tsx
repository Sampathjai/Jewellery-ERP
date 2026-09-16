import React from 'react';

interface GlobalLoaderProps {
  message?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = 'Loading Shankar Jewellery ERP...',
}) => {
  return (
    <div className="flex h-full w-full min-h-[60vh] flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-charcoal-950">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Pulsing Glow Ring */}
        <div className="absolute h-24 w-24 rounded-3xl bg-gold-500/20 animate-ping pointer-events-none" />
        
        {/* Animated Gold Spinner Border */}
        <div className="h-20 w-20 rounded-3xl border-4 border-amber-200 border-t-gold-500 animate-spin dark:border-charcoal-800 dark:border-t-gold-400 shadow-lg" />
        
        {/* Centered SJ Logo Badge */}
        <div className="absolute flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500 font-serif font-bold text-2xl text-charcoal-950 shadow-gold border-2 border-gold-300">
          SJ
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100">
          Shankar Jewellery ERP
        </h3>
        <p className="text-xs font-semibold text-amber-700 dark:text-gold-400 tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

