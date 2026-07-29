interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <img
      src="/stand-logo.webp"
      alt="STand"
      width={size}
      height={size * 0.68}
      className={`object-contain ${className}`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
