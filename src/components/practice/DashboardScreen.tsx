import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Bot, Users, FileText, BookOpen, ChevronRight, Flame, Zap, Star, CheckCircle2, TrendingUp } from 'lucide-react';
import { storage } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getMotivationalLines } from '../../services/api';
import BorderGlow from '../ui/BorderGlow';

function CircularProgress({ percent, size = 100, stroke = 8 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#progressGradient)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-1000"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function DashboardScreen() {
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
        const ds = d.toISOString().split('T')[0];
        if (history.some((h) => h.date.split('T')[0] === ds)) count++;
        else break;
      }
      return count;
    })();

    const bestStreak = (() => {
      let best = 0;
      let current = 0;
      const today = new Date();
      for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (history.some((h) => h.date.split('T')[0] === ds)) {
          current++;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      }
      return best;
    })();

    const todayQ = (() => {
      const today = new Date().toISOString().split('T')[0];
      return history
        .filter((h) => h.date.split('T')[0] === today)
        .reduce((s, h) => s + (h.totalQuestions || 0), 0);
    })();

    const dailyGoalTarget = 50;
    const dailyGoalPercent = Math.min(100, Math.round((todayQ / dailyGoalTarget) * 100));

    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(0), streak, bestStreak, todayQ, dailyGoalTarget, dailyGoalPercent };
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
    } catch {}
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
    const refresh = setInterval(() => fetchLinesRef.current(), 600_000);
    return () => { clearInterval(interval); clearInterval(refresh); };
  }, []);

  const lastSession = history.length > 0 ? history[history.length - 1] : null;

  const recentSessions = history.slice(-5).reverse();

  const quickActions = [
    { label: t('Practice'), desc: t('Start practicing now'), icon: GraduationCap, color: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20', glowColor: '220 80 65', colors: ['#3b82f6', '#60a5fa', '#2563eb'], to: '/practice' },
    { label: 'Ask FenBot', desc: t('Your AI study assistant'), icon: Bot, color: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20', glowColor: '270 70 65', colors: ['#a855f7', '#c084fc', '#7c3aed'], to: '/fenbot' },
    { label: t('Multiplayer'), desc: t('Compete with friends'), icon: Users, color: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20', glowColor: '142 70 65', colors: ['#22c55e', '#4ade80', '#16a34a'], to: '/multiplayer' },
    { label: t('Document Quiz'), desc: t('Upload & quiz smartly'), icon: FileText, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/20', glowColor: '25 80 65', colors: ['#f97316', '#fb923c', '#ea580c'], to: '/doc-quiz' },
  ];

  const sectors = useMemo(() => {
    const map: Record<string, { count: number; avgScore: number; lastDate: string }> = {};
    history.forEach((h) => {
      if (!map[h.sector]) map[h.sector] = { count: 0, avgScore: 0, lastDate: h.date };
      map[h.sector].count++;
      map[h.sector].avgScore += h.score || 0;
      if (h.date > map[h.sector].lastDate) map[h.sector].lastDate = h.date;
    });
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        questions: data.count * 10,
        avgScore: Math.round(data.avgScore / data.count),
        difficulty: (data.avgScore / data.count) >= 80 ? 'Easy' : (data.avgScore / data.count) >= 50 ? 'Medium' : 'Hard',
      }))
      .sort((a, b) => b.questions - a.questions)
      .slice(0, 6);
  }, [history]);

  const sectorColors: Record<string, { gradient: string; glow: string; colors: string[]; icon: string; bg: string }> = {
    Science: { gradient: 'from-green-500/20 to-emerald-500/20 border-green-500/30', glow: '142 70 65', colors: ['#22c55e', '#4ade80', '#16a34a'], icon: 'text-green-400', bg: 'bg-green-500/20' },
    Mathematics: { gradient: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30', glow: '220 80 65', colors: ['#3b82f6', '#60a5fa', '#2563eb'], icon: 'text-blue-400', bg: 'bg-blue-500/20' },
    English: { gradient: 'from-purple-500/20 to-violet-500/20 border-purple-500/30', glow: '270 70 65', colors: ['#a855f7', '#c084fc', '#7c3aed'], icon: 'text-purple-400', bg: 'bg-purple-500/20' },
    default: { gradient: 'from-gray-500/20 to-slate-500/20 border-gray-500/30', glow: '220 60 65', colors: ['#6366f1', '#818cf8', '#4f46e5'], icon: 'text-gray-400', bg: 'bg-gray-500/20' },
  };

  return (
    <div className="min-h-screen px-4 py-4 lg:px-6 lg:py-6 pb-24 lg:pb-6 space-y-5" style={{ background: '#0e1627' }}>
      {/* Greeting */}
      <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="270 80 60" glowRadius={30} glowIntensity={0.5} edgeSensitivity={40} colors={['#a855f7', '#6366f1', '#ec4899']}>
        <div className="relative overflow-hidden p-4">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">
              {t(greeting)}, {firstName}! <span className="inline-block animate-[wave_2s_ease-in-out_infinite]">&#x1F44B;</span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} &middot; {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-gray-400 mt-1 text-sm">{motivationalLine}</p>
          </div>
        </div>
      </BorderGlow>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Daily Goal */}
        <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="270 80 60" glowRadius={20} glowIntensity={0.5} edgeSensitivity={35} colors={['#a855f7', '#c084fc', '#6366f1']}>
          <div className="p-4 relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-1 mb-3">
              <Zap size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{t('Daily Goal')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <CircularProgress percent={stats.dailyGoalPercent} size={80} stroke={7} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">{stats.dailyGoalPercent}%</span>
                  <span className="text-[9px] text-gray-400">{t('Completed')}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-white">{stats.todayQ} <span className="text-sm font-normal text-gray-400">/ {stats.dailyGoalTarget}</span></p>
                <p className="text-xs text-gray-400">{t('Questions')}</p>
              </div>
            </div>
          </div>
        </BorderGlow>

        {/* Streak */}
        <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="25 80 60" glowRadius={20} glowIntensity={0.5} edgeSensitivity={35} colors={['#f97316', '#fb923c', '#ef4444']}>
          <div className="p-4 relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-1 mb-3">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">{t('Current Streak')}</span>
              <ChevronRight size={12} className="text-orange-400 ml-auto" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.streak} <span className="text-base font-normal text-gray-400">{t('Days')}</span></p>
              <p className="text-xs text-gray-400 mt-1">{t('Best Streak')}: {stats.bestStreak} {t('days')}</p>
            </div>
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-100 select-none pointer-events-none drop-shadow-[0_0_12px_rgba(255,120,0,0.8)]">&#x1F525;</div>
          </div>
        </BorderGlow>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">{t('Quick Actions')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, desc, icon: Icon, color, glow, glowColor, colors, to }) => (
            <BorderGlow key={label} backgroundColor="#141e35" borderRadius={16} glowColor={glowColor} glowRadius={20} glowIntensity={0.5} edgeSensitivity={35} colors={colors}>
              <Link
                to={to}
                className="relative group p-4 overflow-hidden block"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity`} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg ${glow}`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <p className="font-semibold text-white text-sm">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
            </BorderGlow>
          ))}
        </div>
      </div>

      {/* Continue Studying */}
      {lastSession && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">{t('Continue Studying')}</h2>
            <Link to="/history" className="text-xs font-semibold text-violet-400 flex items-center gap-0.5 hover:text-violet-300">
              {t('Resume')} <ChevronRight size={14} />
            </Link>
          </div>
          <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="270 70 60" glowRadius={25} glowIntensity={0.5} edgeSensitivity={35} colors={['#8b5cf6', '#c084fc', '#6366f1']}>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                  <BookOpen size={22} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{lastSession.topic}</p>
                  <p className="text-xs text-gray-400">{lastSession.sector} &middot; {lastSession.totalQuestions || 10} {t('Questions')}</p>
                  <div className="mt-2 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${lastSession.score || 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-violet-400 shrink-0">{lastSession.score || 0}%</span>
              </div>
            </div>
          </BorderGlow>
        </div>
      )}

      {/* Recommended for You */}
      {sectors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">{t('Recommended for You')}</h2>
            <Link to="/progress" className="text-xs font-semibold text-violet-400 flex items-center gap-0.5 hover:text-violet-300">
              {t('View All')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {sectors.map((s) => {
              const sc = sectorColors[Object.keys(sectorColors).find((k) => s.name.toLowerCase().includes(k.toLowerCase())) || 'default'];
              return (
                <BorderGlow key={s.name} backgroundColor="#141e35" borderRadius={16} glowColor={sc.glow} glowRadius={20} glowIntensity={0.4} edgeSensitivity={30} colors={sc.colors}>
                  <div className={`snap-start shrink-0 w-[140px] p-3 flex flex-col items-center text-center`}>
                    <div className={`w-14 h-14 rounded-2xl ${sc.bg} flex items-center justify-center mb-2`}>
                      <Star size={26} className={sc.icon} />
                    </div>
                    <p className="font-semibold text-white text-sm leading-tight">{s.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{s.questions} {t('Questions')} &middot; {s.difficulty}</p>
                  </div>
                </BorderGlow>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">{t('Recent Activity')}</h2>
          <Link to="/history" className="text-xs font-semibold text-violet-400 flex items-center gap-0.5 hover:text-violet-300">
            {t('View All')} <ChevronRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {recentSessions.length === 0 ? (
            <BorderGlow backgroundColor="#141e35" borderRadius={16} glowColor="220 60 65" glowRadius={20} glowIntensity={0.3} edgeSensitivity={30} colors={['#6366f1', '#818cf8', '#4f46e5']}>
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">{t('No sessions yet. Start practicing!')}</p>
              </div>
            </BorderGlow>
          ) : (
            recentSessions.map((s) => (
              <BorderGlow key={s.id} backgroundColor="#141e35" borderRadius={16} glowColor={(s.score ?? 0) >= 70 ? '142 70 60' : '25 80 60'} glowRadius={15} glowIntensity={0.4} edgeSensitivity={30} colors={(s.score ?? 0) >= 70 ? ['#22c55e', '#4ade80', '#16a34a'] : ['#f97316', '#fb923c', '#ea580c']}>
                <div className="flex items-center gap-3 p-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${(s.score ?? 0) >= 70 ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                    {(s.score ?? 0) >= 70
                      ? <CheckCircle2 size={20} className="text-emerald-400" />
                      : <TrendingUp size={20} className="text-amber-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{s.topic}</p>
                    <p className="text-xs text-gray-400">{s.sector} &middot; {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${(s.score ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{s.score ?? 0}%</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 shrink-0" />
                </div>
              </BorderGlow>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
