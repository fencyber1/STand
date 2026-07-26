import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, Target, Award } from 'lucide-react';
import { storage } from '../../services/storage';

export default function ProgressScreen() {
  const navigate = useNavigate();
  const history = useMemo(() => storage.getHistory(), []);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const scores = history.map((h) => h.score || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const totalQuestions = history.reduce((a, h) => a + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((a, h) => a + (h.correctAnswers || 0), 0);
    const bestScore = Math.max(...scores);
    const recentScores = history.slice(-10).map((h) => h.score || 0);
    const recentAvg = Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length);

    const subjectMap: Record<string, { total: number; correct: number; sessions: number }> = {};
    history.forEach((h) => {
      const s = h.sector || 'Unknown';
      if (!subjectMap[s]) subjectMap[s] = { total: 0, correct: 0, sessions: 0 };
      subjectMap[s].total += h.totalQuestions || 0;
      subjectMap[s].correct += h.correctAnswers || 0;
      subjectMap[s].sessions += 1;
    });

    const subjects = Object.entries(subjectMap).map(([name, data]) => ({
      name,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      sessions: data.sessions,
    }));

    const streak = (() => {
      let count = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const hasSession = history.some((h) => h.date.split('T')[0] === dateStr);
        if (hasSession) count++;
        else break;
      }
      return count;
    })();

    return { avgScore, totalQuestions, totalCorrect, bestScore, recentAvg, subjects, streak, sessions: history.length };
  }, [history]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Progress</h1>
        <p className="text-gray-500 dark:text-gray-400">Track your improvement over time</p>
      </div>

      {!stats ? (
        <div className="text-center py-16">
          <BarChart3 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No data yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Complete practice sessions to see your progress</p>
          <button
            onClick={() => navigate('/practice')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
          >
            Start Practicing
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-primary-600 dark:text-primary-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Avg Score</span>
              </div>
              <p className={`text-3xl font-bold ${stats.avgScore >= 70 ? 'text-green-600 dark:text-green-400' : stats.avgScore >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.avgScore}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Best Score</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.bestScore}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Streak</span>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.streak}d</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Sessions</span>
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.sessions}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Accuracy</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {stats.totalCorrect}/{stats.totalQuestions} correct ({stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0}%)
            </p>
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Scores</h3>
            <div className="flex items-end gap-1 h-32">
              {history.slice(-10).map((h, i) => {
                const score = h.score || 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{score}%</span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${Math.max(score, 5)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {history.length > 10 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">Last 10 sessions</p>
            )}
          </div>

          {stats.subjects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">By Subject</h3>
              <div className="space-y-3">
                {stats.subjects.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{s.accuracy}% ({s.sessions} sessions)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${s.accuracy >= 70 ? 'bg-green-500' : s.accuracy >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${s.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
