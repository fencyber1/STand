import { lazy, Suspense } from 'react';

const Strands = lazy(() => import('./Strands'));

interface Props {
  size?: number;
  className?: string;
}

function Spinner({ size }: { size: number }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-orange-500/30 via-purple-500/30 to-cyan-500/30 animate-pulse"
      style={{ width: size, height: size }}
    />
  );
}

export default function FenBotIcon({ size = 36, className = '' }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-full shadow-lg shadow-indigo-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <Suspense fallback={<Spinner size={size} />}>
        <Strands
          colors={['#f97316', '#7c3aed', '#06b6d4']}
          count={6}
          speed={0.6}
          amplitude={2.3}
          waviness={2.4}
          thickness={3.2}
          glow={0.8}
          taper={3.1}
          spread={3}
          hueShift={0}
          intensity={0.45}
          saturation={1.55}
          opacity={1}
          scale={1.3}
          glass={false}
          refraction={0.55}
          dispersion={1}
          glassSize={0.98}
        />
      </Suspense>
    </div>
  );
}
