import { getRankIcon, getRankColor } from '../../services/rankingService';

interface RankBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export default function RankBadge({ level, size = 'sm', showLevel = false }: RankBadgeProps) {
  const icon = getRankIcon(level);
  const color = getRankColor(level);

  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-lg',
  };

  const iconSize = {
    sm: 10,
    md: 14,
    lg: 18,
  };

  return (
    <div className="relative inline-flex items-center">
      <span
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-sm`}
        style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}` }}
        title={`Level ${level}`}
      >
        {icon}
      </span>
      {showLevel && (
        <span className="ml-1 text-xs font-bold text-gray-600 dark:text-gray-400">{level}</span>
      )}
    </div>
  );
}

export function RankIcon({ level, size = 16 }: { level: number; size?: number }) {
  return (
    <span style={{ fontSize: size }} className="inline-flex">
      {getRankIcon(level)}
    </span>
  );
}
