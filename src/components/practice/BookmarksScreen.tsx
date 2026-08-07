import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, ArrowLeft, StickyNote } from 'lucide-react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Question } from '../../types';
import BorderGlow from '../ui/BorderGlow';

export default function BookmarksScreen() {
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState<Question[]>(() => storage.getBookmarks());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const navigate = useNavigate();

  const allNotes = useMemo(() => storage.getAllQuestionNotes(), [bookmarks]);

  const handleRemove = (id: string) => {
    const question = bookmarks.find((b) => b.id === id);
    if (question) {
      storage.toggleBookmark(question);
      setBookmarks(bookmarks.filter((b) => b.id !== id));
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t('Remove all bookmarks?'))) {
      bookmarks.forEach((b) => storage.toggleBookmark(b));
      setBookmarks([]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('Back')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Bookmarks')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{bookmarks.length} {t('saved question')}{bookmarks.length !== 1 ? 's' : ''}</p>
        </div>
        {bookmarks.length > 0 && (
          <button onClick={handleClearAll} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('No bookmarks yet')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('Bookmark questions during quizzes to review them later')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((q) => (
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        q.type === 'MCQ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                        q.type === 'Theory' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' :
                        q.type === 'TrueFalse' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                        'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                      }`}>
                        {q.type}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{q.subject}</span>
                      {allNotes[q.id] && (
                        <StickyNote size={12} className="text-yellow-500" />
                      )}
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

                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <StickyNote size={12} className="text-yellow-500" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('Your Note')}</span>
                          </div>
                          {editingNote === q.id ? (
                            <div>
                              <textarea
                                defaultValue={allNotes[q.id] || ''}
                                onBlur={(e) => {
                                  storage.setQuestionNote(q.id, e.target.value);
                                  setEditingNote(null);
                                }}
                                autoFocus
                                className="w-full px-3 py-2 text-xs border border-yellow-200 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-20"
                                placeholder={t('Add a note...')}
                              />
                              <button
                                onClick={() => setEditingNote(null)}
                                className="mt-1 text-xs text-primary-600 dark:text-primary-400 font-medium"
                              >
                                {t('Done')}
                              </button>
                            </div>
                          ) : (
                            <p
                              onClick={() => setEditingNote(q.id)}
                              className={`text-xs cursor-pointer rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                                allNotes[q.id]
                                  ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
                                  : 'text-gray-400 dark:text-gray-500 italic'
                              }`}
                            >
                              {allNotes[q.id] || t('Click to add a note...')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(q.id)}
                    className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition p-1"
                    title={t('Remove bookmark')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </BorderGlow>
          ))}
        </div>
      )}
    </div>
  );
}
