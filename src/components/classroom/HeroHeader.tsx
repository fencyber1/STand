import { XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from './ActionButton';

export function HeroHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header
      className="border-b gray-700/50 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-40"
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {title}
            </h1>
            <p className="mt-1 text-gray-300 text-sm md:text-base">
              {subtitle}
            </p>
          </div>
          <ActionButton onClick={onClose}>
            <XCircle />
          </ActionButton>
        </div>
      </div>
    </header>
  );
}