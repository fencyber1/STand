import Strands from '../effects/Strands';

interface Props {
  size?: number;
}

export default function FenBotLogo({ size = 280 }: Props) {
  return (
    <div className="relative inline-flex items-center justify-center rounded-full overflow-hidden" style={{ width: size, height: size }}>
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
  );
}
