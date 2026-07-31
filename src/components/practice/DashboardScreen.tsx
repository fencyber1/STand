import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target, Clock, TrendingUp, Play, Flame } from 'lucide-react';
import { storage } from '../../services/storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getMotivationalLines } from '../../services/api';
import BorderGlow from '../ui/BorderGlow';
import FenBotIcon from '../effects/FenBotIcon';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const history = useMemo(() => storage.getHistory(), []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = (user?.fullName || 'Student').split(' ')[0];

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = useMemo(() => {
    const total = history.length;
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = total > 0 ? history.reduce((s, h) => s + (h.score || 0), 0) / total : 0;

    const streak = (() => {
      let count = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const hasSession = history.some((h) => h.date.split('T')[0] === dateStr);
        if (hasSession) count++;
        else break;
      }
      return count;
    })();

    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(1), streak };
  }, [history]);

  const [motivationalLine, setMotivationalLine] = useState(() => {
    return localStorage.getItem('stand_motivational_line') || "Every question brings you closer to mastery.";
  });

  const fetchLines = useCallback(async () => {
    try {
      const lines = await getMotivationalLines(firstName, {
        totalSessions: stats.total,
        avgScore: parseFloat(stats.avgScore),
        streak: stats.streak,
      });
      if (lines.length > 0) {
        localStorage.setItem('stand_motivational_lines', JSON.stringify(lines));
        const idx = Math.floor(Math.random() * lines.length);
        setMotivationalLine(lines[idx]);
        localStorage.setItem('stand_motivational_line', lines[idx]);
      }
    } catch {
      // keep current line
    }
  }, [firstName, stats.total, stats.avgScore, stats.streak]);

  const fetchLinesRef = useRef(fetchLines);
  fetchLinesRef.current = fetchLines;

  useEffect(() => {
    const stored = localStorage.getItem('stand_motivational_lines');
    let lines: string[] = [];
    try { lines = stored ? JSON.parse(stored) : []; } catch { lines = []; }

    if (lines.length > 0) {
      const idx = Math.floor(Math.random() * lines.length);
      setMotivationalLine(lines[idx]);
      localStorage.setItem('stand_motivational_line', lines[idx]);
    } else {
      fetchLinesRef.current();
    }

    const interval = setInterval(() => {
      let currentLines: string[] = [];
      try { currentLines = JSON.parse(localStorage.getItem('stand_motivational_lines') || '[]'); } catch { currentLines = []; }
      if (currentLines.length > 0) {
        const next = currentLines[Math.floor(Math.random() * currentLines.length)];
        setMotivationalLine(next);
        localStorage.setItem('stand_motivational_line', next);
      }
    }, 60_000);

    // Refresh from API every 10 minutes — always calls latest fetchLines
    const refresh = setInterval(() => fetchLinesRef.current(), 600_000);

    return () => { clearInterval(interval); clearInterval(refresh); };
  }, []);

  const chartData = useMemo(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    history.forEach((h) => {
      if (!subjectMap[h.sector]) subjectMap[h.sector] = { total: 0, count: 0 };
      subjectMap[h.sector].total += h.score || 0;
      subjectMap[h.sector].count += 1;
    });
    return Object.entries(subjectMap).map(([name, data]) => ({
      name: name.length > 12 ? name.slice(0, 12) + '...' : name,
      score: Math.round(data.total / data.count),
    }));
  }, [history]);

  const recentSessions = history.slice(-5).reverse();
  const cardBg = theme === 'dark' ? '#1f2937' : '#ffffff';

  return (
    <div className="space-y-6">
      <BorderGlow
        backgroundColor={theme === 'dark' ? '#1e1b4b' : '#eef2ff'}
        borderRadius={16}
        glowColor="250 80 70"
        glowRadius={30}
        glowIntensity={0.6}
        edgeSensitivity={40}
        colors={['#6366f1', '#a855f7', '#ec4899']}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <FenBotIcon size={48} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                {t(greeting)}, {firstName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
                {motivationalLine}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="font-medium tracking-wide">{dateStr}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="font-mono tabular-nums">{timeStr}</span>
              </div>
            </div>
          </div>
        </div>
      </BorderGlow>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t('Streak'), value: `${stats.streak}d`, icon: Flame, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', glow: '0 80 60', colors: ['#ef4444', '#f87171', '#dc2626'] },
          { label: t('Total Sessions'), value: stats.total, icon: Target, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', glow: '220 80 60', colors: ['#3b82f6', '#60a5fa', '#2563eb'] },
          { label: t('Questions Done'), value: stats.totalQ, icon: Trophy, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', glow: '142 70 60', colors: ['#22c55e', '#4ade80', '#16a34a'] },
          { label: t('Correct Answers'), value: stats.totalCorrect, icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', glow: '270 70 65', colors: ['#a855f7', '#c084fc', '#7c3aed'] },
          { label: t('Avg Score'), value: `${stats.avgScore}%`, icon: Clock, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', glow: '25 80 60', colors: ['#f97316', '#fb923c', '#ea580c'] },
        ].map(({ label, value, icon: Icon, color, bg, glow, colors }) => (
          <BorderGlow
            key={label}
            backgroundColor={cardBg}
            borderRadius={12}
            glowColor={glow}
            glowRadius={20}
            glowIntensity={0.6}
            edgeSensitivity={40}
            colors={colors}
          >
            <div className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </BorderGlow>
        ))}
      </div>

      {chartData.length > 0 && (
        <BorderGlow
          backgroundColor={cardBg}
          borderRadius={12}
          glowColor="220 70 65"
          glowRadius={25}
          glowIntensity={0.5}
          edgeSensitivity={35}
          colors={['#6366f1', '#8b5cf6', '#3b82f6']}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('Subject Performance')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BorderGlow>
      )}

      <BorderGlow
        backgroundColor={cardBg}
        borderRadius={12}
        glowColor="260 60 65"
        glowRadius={25}
        glowIntensity={0.5}
        edgeSensitivity={35}
        colors={['#c084fc', '#f472b6', '#38bdf8']}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('Recent Sessions')}</h3>
            <Link to="/history" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              {t('View All')}
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('No sessions yet. Start practicing!')}</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{s.topic}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.sector} &middot; {s.level}</p>
                  </div>
                  <span className={`text-lg font-bold ${(s.score ?? 0) >= 70 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {s.score ?? 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </BorderGlow>

      <Link
        to="/practice"
        className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition"
      >
        <Play size={18} />
        {t('Start New Practice')}
      </Link>
    </div>
  );
}
