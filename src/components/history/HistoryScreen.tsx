import { useState, useMemo } from 'react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trash2, Filter } from 'lucide-react';
import type { SessionData } from '../../types';

export default function HistoryScreen() {
  const { t } = useLanguage();
  const [history, setHistory] = useState<SessionData[]>(() => storage.getHistory().reverse());
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    if (filter === 'high') return history.filter((h) => (h.score || 0) >= 70);
    if (filter === 'low') return history.filter((h) => (h.score || 0) < 70);
    return history;
  }, [history, filter]);

  const handleClear = () => {
    if (window.confirm(t('Clear all practice history?'))) {
      storage.clearHistory();
      setHistory([]);
    }
  };

  const handleDelete = (id: string) => {
    storage.deleteHistoryItem(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('History')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('Your practice sessions')}</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClear} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2" title={t('Clear All')}>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'high', label: 'Passed (70%+)' },
          { key: 'low', label: 'Needs Work' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('No sessions yet')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('Start practicing to see your history here')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{session.topic}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {session.sector} &middot; {session.level}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(session.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      (session.score || 0) >= 70 ? 'text-green-600 dark:text-green-400' : (session.score || 0) >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {session.score != null ? `${session.score}%` : 'N/A'}
                  </p>
                  {session.totalQuestions && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {session.correctAnswers}/{session.totalQuestions}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors"
                  title={t('Delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
