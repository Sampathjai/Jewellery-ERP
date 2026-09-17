import React from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showText = true,
  onClick,
}) => {
  const logoSrc = '/brand/shankar-jewellery-logo.png';

  const sizeClasses: Record<string, { img: string; textTitle: string; textSub: string }> = {
    xs: { img: 'h-6 w-6', textTitle: 'text-xs', textSub: 'text-[8px]' },
    sm: { img: 'h-8 w-8', textTitle: 'text-xs', textSub: 'text-[9px]' },
    md: { img: 'h-10 w-10', textTitle: 'text-sm', textSub: 'text-[9px]' },
    lg: { img: 'h-14 w-14', textTitle: 'text-base', textSub: 'text-[10px]' },
    xl: { img: 'h-24 w-24', textTitle: 'text-2xl', textSub: 'text-xs' },
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  if (variant === 'icon') {
    return (
      <img
        src={logoSrc}
        alt="Shankar Jewellery SJ Emblem"
        onClick={onClick}
        className={`object-contain rounded-full shadow-md border border-gold-400/50 bg-white ${selectedSize.img} ${className}`}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div onClick={onClick} className={`flex items-center gap-2.5 min-w-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
        <img
          src={logoSrc}
          alt="Shankar Jewellery Official Emblem"
          className={`shrink-0 object-contain rounded-full shadow-md border border-gold-400/50 bg-white ${selectedSize.img}`}
        />
        {showText && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className={`font-serif font-bold tracking-tight text-charcoal-900 dark:text-slate-100 truncate ${selectedSize.textTitle}`}>
                Shankar Jewellery
              </h1>
              <span className="shrink-0 rounded bg-gold-500/20 px-1 py-0.5 text-[9px] font-bold text-amber-900 dark:text-gold-300 uppercase">
                ERP
              </span>
            </div>
            <p className={`text-amber-700 font-semibold uppercase tracking-wider dark:text-gold-400 truncate ${selectedSize.textSub}`}>
              Trust • Tradition • Technology
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default 'full' variant
  return (
    <div onClick={onClick} className={`flex flex-col items-center text-center gap-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <img
        src={logoSrc}
        alt="Shankar Jewellery ERP Official Logo"
        className={`object-contain drop-shadow-xl ${selectedSize.img}`}
      />
      {showText && (
        <div className="space-y-0.5">
          <h1 className={`font-serif font-bold text-charcoal-900 dark:text-slate-100 ${selectedSize.textTitle}`}>
            Shankar Jewellery
          </h1>
          <p className={`text-amber-800 font-bold uppercase tracking-wider dark:text-gold-400 ${selectedSize.textSub}`}>
            Gold & Silver Jewellery ERP
          </p>
        </div>
      )}
    </div>
  );
};

