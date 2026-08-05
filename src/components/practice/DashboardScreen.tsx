import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Bot, Users, FileText, BookOpen, ChevronRight, Trophy, Flame, Zap, Star, Clock, CheckCircle2, Award, TrendingUp } from 'lucide-react';
import { storage } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getMotivationalLines } from '../../services/api';

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
  const navigate = useNavigate();
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

    const totalMinutes = (() => {
      const today = new Date().toISOString().split('T')[0];
      return history
        .filter((h) => h.date.split('T')[0] === today)
        .reduce((s, h) => s + (h.duration || 0), 0);
    })();

    const dailyGoalTarget = 50;
    const dailyGoalPercent = Math.min(100, Math.round((todayQ / dailyGoalTarget) * 100));

    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(0), streak, bestStreak, todayQ, dailyGoalTarget, dailyGoalPercent, totalMinutes };
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
    { label: t('Practice'), desc: t('Start practicing now'), icon: GraduationCap, color: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20', to: '/practice' },
    { label: 'Ask FenBot', desc: t('Your AI study assistant'), icon: Bot, color: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20', to: '/fenbot' },
    { label: t('Multiplayer'), desc: t('Compete with friends'), icon: Users, color: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20', to: '/multiplayer' },
    { label: t('Document Quiz'), desc: t('Upload & quiz smartly'), icon: FileText, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/20', to: '/doc-quiz' },
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

  const sectorColors: Record<string, string> = {
    Science: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    Mathematics: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    English: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
    default: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  };

  const sectorIconColors: Record<string, string> = {
    Science: 'text-green-400',
    Mathematics: 'text-blue-400',
    English: 'text-purple-400',
    default: 'text-gray-400',
  };

  const sectorBgColors: Record<string, string> = {
    Science: 'bg-green-500/20',
    Mathematics: 'bg-blue-500/20',
    English: 'bg-purple-500/20',
    default: 'bg-gray-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 space-y-5">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1040] via-[#15102a] to-[#0d0a20] border border-purple-500/10 p-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            {t(greeting)}, {firstName}! <span className="inline-block animate-[wave_2s_ease-in-out_infinite]">&#x1F44B;</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">{motivationalLine}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Daily Goal */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#1a1040] to-[#120e28] border border-purple-500/10 p-4 overflow-hidden">
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
              <div className="flex items-center gap-1 mt-1">
                <Clock size={11} className="text-gray-500" />
                <span className="text-[11px] text-gray-500">{stats.totalMinutes} min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#1a1040] to-[#120e28] border border-orange-500/10 p-4 overflow-hidden">
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
          <div className="absolute -bottom-2 -right-2 text-5xl opacity-20 select-none pointer-events-none">&#x1F525;</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">{t('Quick Actions')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, desc, icon: Icon, color, glow, to }) => (
            <Link
              key={label}
              to={to}
              className={`relative group rounded-2xl bg-gradient-to-br from-[#1a1040] to-[#120e28] border border-white/5 p-4 overflow-hidden hover:border-white/10 transition-all active:scale-[0.97]`}
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
          <div className="rounded-2xl bg-gradient-to-br from-[#1a1040] to-[#120e28] border border-violet-500/10 p-4">
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
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
            {sectors.map((s) => {
              const colorKey = Object.keys(sectorColors).find((k) => s.name.toLowerCase().includes(k.toLowerCase())) || 'default';
              return (
                <div
                  key={s.name}
                  className={`snap-start shrink-0 w-[140px] rounded-2xl bg-gradient-to-br ${sectorColors[colorKey]} border p-3 flex flex-col items-center text-center`}
                >
                  <div className={`w-14 h-14 rounded-2xl ${sectorBgColors[colorKey]} flex items-center justify-center mb-2`}>
                    <Star size={26} className={sectorIconColors[colorKey]} />
                  </div>
                  <p className="font-semibold text-white text-sm leading-tight">{s.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{s.questions} {t('Questions')} &middot; {s.difficulty}</p>
                </div>
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
        <div className="space-y-2">
          {recentSessions.length === 0 ? (
            <div className="rounded-2xl bg-[#120e28] border border-white/5 p-8 text-center">
              <p className="text-gray-400 text-sm">{t('No sessions yet. Start practicing!')}</p>
            </div>
          ) : (
            recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-[#120e28] border border-white/5 p-3.5 group hover:border-white/10 transition-all">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
