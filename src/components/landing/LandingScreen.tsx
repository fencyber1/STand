import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function LandingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary-600 shadow-lg shadow-primary-500/30 mb-6">
          <GraduationCap size={48} className="text-white" />
        </div>

        <h1 className="text-5xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight mb-2">
          STand
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto">
          AI-Powered Exam Practice Platform
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="w-48 py-3 bg-primary-600 text-white rounded-xl font-semibold text-center hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="w-48 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-center hover:border-primary-400 dark:hover:border-primary-500 transition-all hover:scale-105"
          >
            Sign Up
          </Link>
        </div>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-500">
          Practice smarter with AI-generated questions, timers, and progress tracking
        </p>
      </div>
    </div>
  );
}
