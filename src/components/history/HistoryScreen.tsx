import { useState, useMemo } from 'react';
import { storage } from '../../services/storage';
import { Trash2, Filter } from 'lucide-react';
import type { SessionData } from '../../types';

export default function HistoryScreen() {
  const [history, setHistory] = useState<SessionData[]>(() => storage.getHistory().reverse());
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    if (filter === 'high') return history.filter((h) => (h.score || 0) >= 70);
    if (filter === 'low') return history.filter((h) => (h.score || 0) < 70);
    return history;
  }, [history, filter]);

  const handleClear = () => {
    if (window.confirm('Clear all practice history?')) {
      storage.clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">History</h1>
          <p className="text-gray-500">Your practice sessions</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClear} className="text-red-500 hover:text-red-700 p-2">
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
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No practice sessions yet</p>
          <p className="text-sm text-gray-400">Start practicing to see your history here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">{session.topic}</p>
                <p className="text-sm text-gray-500">
                  {session.sector} &middot; {session.level}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(session.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right ml-4">
                <p
                  className={`text-xl font-bold ${
                    (session.score || 0) >= 70 ? 'text-green-600' : (session.score || 0) >= 50 ? 'text-orange-600' : 'text-red-600'
                  }`}
                >
                  {session.score != null ? `${session.score}%` : 'N/A'}
                </p>
                {session.totalQuestions && (
                  <p className="text-xs text-gray-400">
                    {session.correctAnswers}/{session.totalQuestions}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
