import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../ui/utils';

export interface NavItemProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  badgeCount?: number;
  active?: boolean;
  onSelect?: () => void;
}

export function NavItem({
  title,
  icon,
  href,
  badgeCount,
  active = false,
  onSelect,
}: NavItemProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = active || location.pathname === href;

  return (
    <div
      className={cn(
        'group cursor-pointer select-none rounded-lg p-3 md:p-4 transition-colors duration-200',
        'hover:bg-gray-700/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      )}
      onClick={onSelect}
    >
      {isActive ? (
        <div className="bg-blue-600/10 rounded-lg p-2 md:p-3">
          {icon}
          <span className="ml-2 text-sm font-medium text-blue-400">{title}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm text-gray-300">{title}</span>
        </div>
      )}
      {badgeCount && (
        <span
          className="absolute -top-1 -right-1 rounded-full bg-red-500 text-xs text-white px-2 py-1"
        >
          {badgeCount}
        </span>
      )}
    </div>
  );
}