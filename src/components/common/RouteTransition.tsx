import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { pageTransition } from '@/animations/variants';
import { useMotionSafe } from '@/animations/motionConfig';

interface RouteTransitionProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * RouteTransition
 * Universal enterprise-grade route transition container for Shankar Jewellery ERP.
 * 
 * - Keyed on location.pathname for instant route crossfade
 * - Uses forwardRef so Motion popLayout directly interacts with DOM node
 * - Strictly isolates main content transition without affecting persistent Sidebar / Header
 * - Respects prefers-reduced-motion for zero latency / accessibility
 */
export const RouteTransition = React.forwardRef<HTMLDivElement, RouteTransitionProps>(
  ({ children, className = '' }, ref) => {
    const location = useLocation();
    const { prefersReduced } = useMotionSafe();

    if (prefersReduced) {
      return (
        <div ref={ref} className={`relative w-full flex-1 flex flex-col min-w-0 ${className}`}>
          {children}
        </div>
      );
    }

    return (
      <div ref={ref} className={`relative w-full flex-1 flex flex-col min-w-0 ${className}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex-1 flex flex-col min-w-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
);

RouteTransition.displayName = 'RouteTransition';
