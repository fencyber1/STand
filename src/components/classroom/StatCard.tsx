import React from 'react';

export interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  variant?: 'primary' | 'secondary';
}

export function StatCard({ icon, value, label, variant = 'primary' }: StatCardProps) {
  const bgColor = variant === 'primary' ? 'blue-600' : 'purple-600';
  const textColor = variant === 'primary' ? 'blue-400' : 'purple-400';

  return (
    <div
      className="bg-gray-800 rounded-lg p-4 md:p-6 border-t-4 {bgColor}-500 border-gray-700/50 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start sm:flex-row gap-3">
        <div className="mt-1 sm:mt-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium {textColor}-300 truncate">{label}</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}