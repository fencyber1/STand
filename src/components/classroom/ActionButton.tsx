import React from 'react';

export interface ActionButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function ActionButton({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  onClick,
  disabled,
}: ActionButtonProps) {
  const bgColor = variant === 'primary' ? 'bg-blue-600' : 'bg-purple-600';
  const textColor = variant === 'primary' ? 'text-white' : 'text-white';
  const hoverColor = variant === 'primary' ? 'hover:bg-blue-600/90' : 'hover:bg-purple-600/90';

  const sizeStyles = {
    sm: 'h-9 w-full rounded-md text-sm px-4 py-2',
    md: 'h-10 w-full rounded-md text-base px-6 py-3',
    lg: 'h-12 w-full rounded-md text-lg px-8 py-4',
  };

  const commonClasses =
    bgColor +
    ' ' +
    textColor +
    ' rounded-md shadow-sm transition-all duration-150 ' +
    hoverColor +
    ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
    (disabled && 'opacity-50 cursor-not-allowed') +
    ' ' + sizeStyles[size] + ' active:scale-95';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={commonClasses}
    >
      {leftIcon && (
        <span className="flex items-center gap-2">
          {leftIcon}
        </span>
      )}
      {children}
    </button>
  );
}