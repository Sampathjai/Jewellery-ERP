import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, HandCoins, Boxes, Menu } from 'lucide-react';

interface BottomNavProps {
  onOpenSidebar: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSidebar }) => {
  const items = [
    { label: 'POS', path: '/pos', icon: ShoppingCart },
    { label: 'Wholesale', path: '/wholesale-issues', icon: HandCoins },
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Stock', path: '/products', icon: Boxes },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 dark:border-charcoal-800 dark:bg-charcoal-900 lg:hidden shadow-lg">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-gold-600 font-bold dark:text-gold-400' : 'text-slate-600 dark:text-slate-400'
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400"
      >
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
};

