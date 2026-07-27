interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 200, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 400 120"
      width={size}
      height={size * 0.3}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="10"
        y="85"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        fontSize="72"
        fill="currentColor"
      >
        ST
      </text>

      <g transform="translate(138, 20)">
        <path
          d="M8 80 L8 10 L0 25 L8 10 L16 25 Z"
          fill="currentColor"
          transform="translate(0, 0)"
        />
        <path
          d="M8 80 L8 10 L0 25 L8 10 L16 25 Z"
          fill="currentColor"
          transform="translate(20, 0)"
        />
      </g>

      <text
        x="192"
        y="85"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        fontSize="72"
        fill="currentColor"
      >
        and
      </text>
    </svg>
  );
}
