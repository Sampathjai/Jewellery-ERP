import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageWrapper
 * Lightweight layout utility wrapper for page components.
 * Route transitions are handled universally by RouteTransition in DashboardLayout.
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full flex-1 flex flex-col min-w-0 ${className}`}>
      {children}
    </div>
  );
};
