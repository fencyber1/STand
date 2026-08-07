import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { ACHIEVEMENTS } from '../../constants/achievements';
import { storage } from '../../services/storage';
import { useLanguage } from '../../contexts/LanguageContext';
import BorderGlow from '../ui/BorderGlow';

export default function AchievementsScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const history = storage.getHistory();
    const totalSessions = history.length;
    const totalQuestions = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const subjects = new Set(history.map((h) => h.sector)).size;
    const perfectScores = history.filter((h) => h.score === 100).length;

    let streak = 0;
    const dates = [...new Set(history.map((h) => new Date(h.date).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    const allTimings = storage.getQuestionTimings();
    const fastestAnswer = allTimings.length > 0 ? Math.min(...allTimings.map((t) => t.timeSpent)) : null;

    return { totalSessions, totalQuestions, totalCorrect, subjects, perfectScores, streak, timeSpent: totalSessions * 300, fastestAnswer };
  }, []);

  const unlockedIds = useMemo(() => new Set(storage.getAchievements().map((a) => a.id)), []);
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('Back')}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Achievements')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{unlockedCount} / {ACHIEVEMENTS.length} {t('unlocked')}</p>
      </div>

      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = unlockedIds.has(ach.id);
          return (
            <BorderGlow
              key={ach.id}
              backgroundColor="#1f2937"
              borderRadius={12}
              glowColor={unlocked ? '140 200 80' : '100 100 100'}
              glowRadius={unlocked ? 25 : 8}
              glowIntensity={unlocked ? 0.8 : 0.2}
              edgeSensitivity={30}
              colors={unlocked ? ['#22c55e', '#16a34a', '#15803d'] : ['#6b7280', '#4b5563', '#374151']}
            >
              <div className={`p-4 dark:bg-gray-800 flex items-center gap-4 ${!unlocked ? 'opacity-60' : ''}`}>
                <div className={`text-3xl ${!unlocked ? 'grayscale' : ''}`}>
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{ach.name}</h3>
                    {unlocked ? (
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                    ) : (
                      <Lock size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{ach.description}</p>
                </div>
              </div>
            </BorderGlow>
          );
        })}
      </div>
    </div>
  );
}
