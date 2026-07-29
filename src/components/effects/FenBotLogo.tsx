import Strands from '../effects/Strands';
import Logo from '../landing/Logo';

interface Props {
  size?: number;
}

export default function FenBotLogo({ size = 280 }: Props) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size * 0.5 }}>
      {/* Strands glow behind logo */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <Strands
          colors={['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD']}
          count={5}
          speed={0.6}
          amplitude={1.5}
          waviness={2.5}
          thickness={2.5}
          glow={4}
          taper={3}
          spread={1.8}
          intensity={0.5}
          saturation={1.5}
          opacity={0.9}
          scale={1.2}
        />
      </div>

      {/* Logo on top */}
      <div className="relative z-10 flex items-center justify-center drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]">
        <Logo size={size * 0.85} className="text-white" />
      </div>
    </div>
  );
}
