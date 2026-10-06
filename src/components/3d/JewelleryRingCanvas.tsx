import React, { useRef, useMemo, Component, ErrorInfo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMotionSafe } from '@/animations/motionConfig';

// ─── 3D Gold Ring Object ──────────────────────────────────────────────────────

const GoldRingMesh: React.FC<{ prefersReduced: boolean }> = ({ prefersReduced }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Reusable materials & geometries disposed automatically by Three/Fiber or cleanup
  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d4af37'),
        metalness: 0.92,
        roughness: 0.22,
        envMapIntensity: 1.2,
      }),
    []
  );

  const diamondMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );

  useFrame((state, delta) => {
    if (groupRef.current && !prefersReduced) {
      groupRef.current.rotation.y += delta * 0.45;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    }
  });

  return (
    <group ref={groupRef} scale={1.35}>
      {/* Gold Ring Band (Torus) */}
      <mesh material={goldMaterial}>
        <torusGeometry args={[1.0, 0.14, 24, 48]} />
      </mesh>

      {/* Gemstone Setting Crown */}
      <mesh position={[0, 1.05, 0]} material={goldMaterial}>
        <cylinderGeometry args={[0.22, 0.12, 0.18, 8]} />
      </mesh>

      {/* Brilliant Cut Diamond Stone */}
      <mesh position={[0, 1.18, 0]} rotation={[0, Math.PI / 8, 0]} material={diamondMaterial}>
        <octahedronGeometry args={[0.28, 0]} />
      </mesh>
    </group>
  );
};

// ─── WebGL Error Boundary ─────────────────────────────────────────────────────

interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Three.js / WebGL fallback activated:', error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ─── CSS Fallback (Zero WebGL dependency) ──────────────────────────────────────

const LuxuryRingFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center p-4">
    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-gold-400/80 bg-gradient-to-tr from-amber-950/40 via-gold-500/20 to-transparent shadow-[0_0_30px_rgba(212,175,55,0.3)]">
      <div className="h-20 w-20 rounded-full border-2 border-gold-300/60 bg-charcoal-950/80" />
      <div className="absolute -top-2 h-4 w-4 rotate-45 bg-white shadow-[0_0_12px_#fff]" />
    </div>
  </div>
);

// ─── Main Exported Canvas (Lazy-load friendly) ────────────────────────────────

export const JewelleryRingCanvas: React.FC<{ className?: string }> = ({ className = 'h-48 w-full' }) => {
  const { prefersReduced } = useMotionSafe();

  // Test WebGL availability before attempting Canvas initialization
  const isWebGLAvailable = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }, []);

  if (!isWebGLAvailable) {
    return <LuxuryRingFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<LuxuryRingFallback />}>
      <div className={className}>
        <Canvas
          camera={{ position: [0, 0, 3.8], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 5, 3]} intensity={1.5} color="#fff6e0" />
          <pointLight position={[-3, -2, -2]} intensity={0.6} color="#d4af37" />
          <GoldRingMesh prefersReduced={prefersReduced} />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
};

export default JewelleryRingCanvas;
