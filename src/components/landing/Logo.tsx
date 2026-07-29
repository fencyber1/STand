interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <img
      src="/stand-logo.png"
      alt="STand"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={(e) => {
        // Fallback to text if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.textContent = 'STand';
        fallback.className = `text-2xl font-bold ${className}`;
        target.parentNode?.insertBefore(fallback, target);
      }}
    />
  );
}
