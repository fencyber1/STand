import { lazy, Suspense } from 'react';

const Strands = lazy(() => import('../effects/Strands'));

interface Props {
  size?: number;
}

export default function FenBotLogo({ size = 280 }: Props) {
  return (
    <div className="relative inline-flex items-center justify-center rounded-full overflow-hidden" style={{ width: size, height: size }}>
      <Suspense fallback={
        <div
          className="rounded-full bg-gradient-to-br from-orange-500/30 via-purple-500/30 to-cyan-500/30 animate-pulse"
          style={{ width: size, height: size }}
        />
      }>
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
