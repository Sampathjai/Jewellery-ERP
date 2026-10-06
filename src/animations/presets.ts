/**
 * SHANKAR JEWELLERY ERP — Animation Presets
 * Pre-configured micro-interaction props to spread directly onto motion components.
 */

import type { TargetAndTransition } from 'motion/react';

export const cardHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.01,
    boxShadow: '0 8px 24px rgba(212, 175, 55, 0.10)',
    transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 },
  },
  whileTap: {
    scale: 0.99,
    transition: { duration: 0.08 },
  },
};

export const buttonHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.01,
    transition: { type: 'spring', stiffness: 450, damping: 28 },
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.08 },
  },
};

export const quickActionPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.015,
    y: -2,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.98,
    y: 0,
    transition: { duration: 0.08 },
  },
};

export const iconHoverPreset: { whileHover: TargetAndTransition } = {
  whileHover: {
    rotate: 6,
    scale: 1.08,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
};

export const navItemPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    x: 2,
    transition: { duration: 0.14, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.98,
  },
};
