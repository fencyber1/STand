import { Link, Outlet } from 'react-router-dom';
import Logo from './Logo';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LandingScreen() {
  const { t } = useLanguage();
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-8 transition-colors overflow-y-auto">
        <div className="text-center">
          <div className="mb-6 text-primary-600 dark:text-primary-400">
            <Logo size={280} />
          </div>

          <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto">
            {t('AI-Powered Exam Practice Platform')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-48 py-3 bg-primary-600 text-white rounded-xl font-semibold text-center hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
            >
              {t('Sign In')}
            </Link>
            <Link
              to="/register"
              className="w-48 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-center hover:border-primary-400 dark:hover:border-primary-500 transition-all hover:scale-105"
            >
              {t('Sign Up')}
            </Link>
          </div>

          <p className="mt-12 text-xs text-gray-400 dark:text-gray-500">
            {t('Practice smarter with AI-generated questions, timers, and progress tracking')}
          </p>
        </div>
      </div>
      <Outlet />
    </>
  );
}
