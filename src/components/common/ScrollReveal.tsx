import React from 'react';
import { motion } from 'motion/react';
import { useMotionSafe } from '@/animations/motionConfig';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

/**
 * SHANKAR JEWELLERY ERP — Centralized Scroll-Reveal Component
 * Uses Motion's whileInView with viewport={{ once: true, margin: '-40px' }}
 * Ensures sections animate once upon entering viewport and stay visible without replaying.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  yOffset = 20,
}) => {
  const { prefersReduced } = useMotionSafe();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.38,
        delay,
        ease: [0.22, 1, 0.36, 1], // Luxury cubic easeOut
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
