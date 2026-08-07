import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Bookmark } from 'lucide-react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Question } from '../../types';
import BorderGlow from '../ui/BorderGlow';

export default function SearchScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [bookmarks] = useState<Question[]>(() => storage.getBookmarks());
  const [expanded, setExpanded] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.question.toLowerCase().includes(q) ||
        b.explanation.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.topic.toLowerCase().includes(q) ||
        (b.options && b.options.some((o) => o.toLowerCase().includes(q)))
    );
  }, [query, bookmarks]);

  return (
    <div className="max-w-2xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('Back')}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Search Questions')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('Search through your bookmarked questions')}</p>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search by keyword, topic, or subject...')}
          autoFocus
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm"
        />
      </div>

      {query.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {results.length} {t('result')}{results.length !== 1 ? 's' : ''} {t('found')}
        </p>
      )}

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('No bookmarks to search')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('Bookmark questions during quizzes first')}</p>
        </div>
      ) : results.length === 0 && query.trim() ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('No results for')} "{query}"</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('Try different keywords')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((q) => (
            <BorderGlow
              key={q.id}
              backgroundColor="#1f2937"
              borderRadius={12}
              glowColor="220 80 70"
              glowRadius={20}
              glowIntensity={0.8}
              edgeSensitivity={30}
              colors={['#6366f1', '#8b5cf6', '#3b82f6']}
            >
              <div className="p-4 dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    q.type === 'MCQ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                    q.type === 'Theory' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' :
                    q.type === 'TrueFalse' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                    'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                  }`}>
                    {q.type}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{q.subject} · {q.difficulty}</span>
                </div>
                <p
                  className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed cursor-pointer"
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                >
                  {q.question}
                </p>
                {expanded === q.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {q.options && (
                      <div className="mb-2">
                        {q.options.map((opt, i) => {
                          const isCorrect = opt === q.correctAnswer || opt.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase() === String(q.correctAnswer).replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
                          return (
                            <p key={i} className={`text-xs py-0.5 ${isCorrect ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                              {opt} {isCorrect && '✓'}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400"><strong>{t('Answer')}:</strong> {(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).replace(/^[A-Za-z][.\s]+/, '').trim()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1"><strong>{t('Explanation')}:</strong> {q.explanation}</p>
                  </div>
                )}
              </div>
            </BorderGlow>
          ))}
        </div>
      )}

      {!query.trim() && bookmarks.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('Type to search through')} {bookmarks.length} {t('bookmarked questions')}</p>
        </div>
      )}
    </div>
  );
}
