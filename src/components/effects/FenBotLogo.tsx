interface Props {
  size?: number;
  className?: string;
}

export default function FenBotLogo({ size = 280, className = '' }: Props) {
  return (
    <img
      src="/stand-logo.webp"
      alt="STand"
      draggable={false}
      className={`block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'brightness(1.2) saturate(1.3)',
      }}
    />
  );
}
