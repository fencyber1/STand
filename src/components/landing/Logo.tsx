interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <img
      src="/stand-logo.webp"
      alt="STand"
      draggable={false}
      className={`block ${className}`}
      style={{
        width: size,
        height: 'auto',
        objectFit: 'contain',
        objectPosition: 'center 35%',
        filter: 'brightness(1.4) saturate(1.5) contrast(1.1) drop-shadow(0 0 12px rgba(255, 140, 30, 0.5))',
      }}
    />
  );
}
