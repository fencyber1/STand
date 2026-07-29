import Strands from './Strands';

interface Props {
  size?: number;
  className?: string;
}

export default function FenBotIcon({ size = 36, className = '' }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-full shadow-lg shadow-indigo-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <Strands
        colors={['#6366F1', '#8B5CF6', '#A78BFA']}
        count={3}
        speed={0.8}
        amplitude={1.5}
        waviness={2}
        thickness={2}
        glow={3}
        taper={2}
        spread={1.2}
        intensity={0.6}
        saturation={1.5}
        opacity={1}
        scale={1.5}
      />
    </div>
  );
}
