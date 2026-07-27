import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, TrendingDown, Play, BarChart3 } from 'lucide-react';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';

interface TopicStats {
  subject: string;
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

export default function WeakAreasScreen() {
  const navigate = useNavigate();
  const [minAttempts, setMinAttempts] = useState(3);

  const history = useMemo(() => storage.getHistory(), []);

  const topicStats = useMemo((): TopicStats[] => {
    const map: Record<string, { subject: string; topic: string; total: number; correct: number }> = {};
    for (const session of history) {
      const key = `${session.sector}|${session.topic}`;
      if (!map[key]) {
        map[key] = { subject: session.sector, topic: session.topic, total: 0, correct: 0 };
      }
      map[key].total += session.totalQuestions || 0;
      map[key].correct += session.correctAnswers || 0;
    }
    return Object.values(map)
      .map((s) => ({
        ...s,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
      .filter((s) => s.total >= minAttempts)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [history, minAttempts]);

  const weakTopics = topicStats.filter((t) => t.accuracy < 70);
  const midTopics = topicStats.filter((t) => t.accuracy >= 70 && t.accuracy < 85);
  const strongTopics = topicStats.filter((t) => t.accuracy >= 85);

  const overallStats = useMemo(() => {
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalC = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
    return { totalQ, totalC, avgScore, sessions: history.length };
  }, [history]);

  const handlePracticeWeak = (topic: TopicStats) => {
    navigate('/practice', { state: { prefillSubject: topic.subject, prefillTopic: topic.topic } });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Weak Areas</h1>
        <p className="text-gray-500 dark:text-gray-400">Topics you need to focus on</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{strongTopics.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Strong (85%+)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{midTopics.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Mid (70-85%)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{weakTopics.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Weak (&lt;70%)</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600 dark:text-gray-400">Min attempts:</label>
        <select
          value={minAttempts}
          onChange={(e) => setMinAttempts(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <option value={1}>1</option>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </div>

      {topicStats.length === 0 ? (
        <div className="text-center py-16">
          <Target size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Not enough data yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Complete more quizzes to see your weak areas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weakTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <TrendingDown size={14} /> Needs Improvement
              </h3>
              <div className="space-y-2">
                {weakTopics.map((t) => (
                  <TopicCard key={`${t.subject}-${t.topic}`} stats={t} onPractice={handlePracticeWeak} />
                ))}
              </div>
            </div>
          )}

          {midTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-500 dark:text-orange-400 mb-2 flex items-center gap-1">
                <BarChart3 size={14} /> Getting There
              </h3>
              <div className="space-y-2">
                {midTopics.map((t) => (
                  <TopicCard key={`${t.subject}-${t.topic}`} stats={t} onPractice={handlePracticeWeak} />
                ))}
              </div>
            </div>
          )}

          {strongTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <Target size={14} /> Strong Areas
              </h3>
              <div className="space-y-2">
                {strongTopics.map((t) => (
                  <TopicCard key={`${t.subject}-${t.topic}`} stats={t} onPractice={handlePracticeWeak} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicCard({ stats, onPractice }: { stats: TopicStats; onPractice: (s: TopicStats) => void }) {
  const color = stats.accuracy >= 85 ? 'green' : stats.accuracy >= 70 ? 'orange' : 'red';
  const barColor = color === 'green' ? 'bg-green-500' : color === 'orange' ? 'bg-orange-500' : 'bg-red-500';

  return (
    <BorderGlow
      backgroundColor="#1f2937"
      borderRadius={10}
      glowColor="220 80 70"
      glowRadius={15}
      glowIntensity={0.3}
      colors={['#6366f1', '#8b5cf6', '#3b82f6']}
    >
      <div className="p-3 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{stats.topic}</span>
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{stats.subject}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold text-${color}-600 dark:text-${color}-400`}>{stats.accuracy}%</span>
            <button
              onClick={() => onPractice(stats)}
              className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800/40 transition"
              title="Practice this topic"
            >
              <Play size={14} />
            </button>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${stats.accuracy}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.correct}/{stats.total} correct</p>
      </div>
    </BorderGlow>
  );
}
