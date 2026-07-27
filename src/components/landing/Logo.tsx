interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 320 110"
      width={size}
      height={size * (110 / 320)}
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

      {/* Arrow 1 */}
      <g transform="translate(112, 5)">
        {/* Shaft */}
        <rect x="4" y="30" width="10" height="55" rx="1" fill="currentColor" />
        {/* Head */}
        <polygon points="9,0 -1,28 19,28" fill="currentColor" />
      </g>

      {/* Arrow 2 */}
      <g transform="translate(132, 5)">
        {/* Shaft */}
        <rect x="4" y="30" width="10" height="55" rx="1" fill="currentColor" />
        {/* Head */}
        <polygon points="9,0 -1,28 19,28" fill="currentColor" />
      </g>

      {/* and */}
      <text
        x="158"
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
