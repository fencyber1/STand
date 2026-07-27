interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 280 110"
      width={size}
      height={size * (110 / 280)}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ST */}
      <text
        x="0"
        y="82"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="74"
        fill="currentColor"
        letterSpacing="-2"
      >ST</text>

      {/* Double arrow - two overlapping arrows */}
      <g transform="translate(108, 5)">
        {/* Arrow 1 - back */}
        <rect x="5" y="30" width="6" height="55" rx="1" fill="currentColor" />
        <polygon points="8,0 -2,26 18,26" fill="currentColor" />

        {/* Arrow 2 - front, slightly offset right */}
        <rect x="13" y="30" width="6" height="55" rx="1" fill="currentColor" />
        <polygon points="16,0 6,26 26,26" fill="currentColor" />
      </g>

      {/* and */}
      <text
        x="148"
        y="82"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="74"
        fill="currentColor"
        letterSpacing="-2"
      >and</text>
    </svg>
  );
}
