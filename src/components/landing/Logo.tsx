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
      }}
    />
  );
}
