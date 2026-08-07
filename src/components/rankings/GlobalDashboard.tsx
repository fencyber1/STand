import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Star, Flame, Award, Target, Zap, Users, TrendingUp,
  Calendar, Clock, CheckCircle, ChevronDown, ChevronUp,
  Globe, MapPin, School, BookOpen, Gift, Crown, HelpCircle,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import {
  subscribeToUserRanking,
  subscribeToLeaderboard,
  RANK_TIER_COLORS,
  RANK_TIER_ICONS,
  XP_REWARDS,
  getLevelForXP,
  getXPToNextLevel,
  getTierForXP,
  getXPToNextTier,
  getXPForTier,
  checkBadges,
  getDefaultStats,
  getWeeklyMissions,
  getDailyRewards,
  getCurrentSeason,
  ALL_BADGES,
} from '../../services/rankingService';
import type { UserRanking, LeaderboardEntry, AchievementBadge, UserStatistics, WeeklyMission, DailyReward } from '../../types';
import BorderGlow from '../ui/BorderGlow';

type DashTab = 'overview' | 'rankings' | 'missions' | 'badges' | 'season';

export default function GlobalDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<UserStatistics>(getDefaultStats());

  const unsubUserRef = useRef<(() => void) | null>(null);
  const unsubLBRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    unsubUserRef.current = subscribeToUserRanking(user.uid, (data) => {
      setUserRanking(data);
      if (data) {
        setStats({
          questionsAnswered: data.totalQuestions,
          accuracyRate: data.totalQuestions > 0 ? Math.round((data.totalCorrect / data.totalQuestions) * 100) : 0,
          avgResponseTime: 0,
          lessonsCompleted: data.totalSessions,
          challengesCompleted: 0,
          multiplayerWins: 0,
          friendsHelped: 0,
          totalStudyHours: Math.round(data.totalSessions * 0.5 * 10) / 10,
          currentStreak: data.currentStreak,
          longestStreak: data.maxStreak,
        });
      }
    });
    return () => { if (unsubUserRef.current) unsubUserRef.current(); };
  }, [user?.uid]);

  useEffect(() => {
    unsubLBRef.current = subscribeToLeaderboard('overall', (entries) => {
      setLeaderboard(entries);
    });
    return () => { if (unsubLBRef.current) unsubLBRef.current(); };
  }, []);

  const displayRank = useMemo(() => {
    if (!userRanking) return 0;
    const entry = leaderboard.find((e) => e.uid === user?.uid);
    return entry?.rank || userRanking.rank || 0;
  }, [leaderboard, userRanking, user?.uid]);

  const tabs: { id: DashTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'missions', label: 'Missions', icon: Target },
    { id: 'season', label: 'Season', icon: Crown },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Global Rankings</h1>
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 text-sm">
          {t('Back')}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          userRanking={userRanking}
          stats={stats}
          displayRank={displayRank}
        />
      )}
      {activeTab === 'rankings' && (
        <RankingsTab
          leaderboard={leaderboard}
          userUid={user?.uid || ''}
          userRanking={userRanking}
        />
      )}
      {activeTab === 'badges' && <BadgesTab stats={stats} displayRank={displayRank} />}
      {activeTab === 'missions' && <MissionsTab userRanking={userRanking} />}
      {activeTab === 'season' && <SeasonTab />}
    </div>
  );
}

function OverviewTab({ userRanking, stats, displayRank }: { userRanking: UserRanking | null; stats: UserStatistics; displayRank: number }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const tier = userRanking?.tier || 'Bronze';

  return (
    <div className="space-y-4">
      <BorderGlow backgroundColor="#1f2937" borderRadius={16} glowColor="140 200 80" glowRadius={15} glowIntensity={0.7} edgeSensitivity={25} colors={['#22c55e', '#16a34a', '#15803d']}>
        <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                #{displayRank > 0 ? displayRank.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Global Rank</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Lv. {userRanking?.level || 1}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Level</div>
            </div>
          </div>
          <div className="text-center mb-3">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {(userRanking?.totalXP || 0).toLocaleString()} XP
            </div>
            {userRanking && getXPToNextTier(userRanking.totalXP) > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getXPToNextTier(userRanking.totalXP)} XP to next tier
              </div>
            )}
          </div>
          {userRanking && (
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((userRanking.totalXP - getXPForTier(tier)) / Math.max(1, getXPToNextTier(userRanking.totalXP) || 1)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </BorderGlow>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Star size={18} className="text-yellow-500" />} label="XP Today" value={`${userRanking?.weeklyXP || 0}`} />
        <StatCard icon={<Flame size={18} className="text-orange-500" />} label="Streak" value={`${userRanking?.currentStreak || 0}d`} />
        <StatCard icon={<Award size={18} className="text-purple-500" />} label="Badges" value={`${ALL_BADGES.length}`} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" /> Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatRow label="Questions Answered" value={stats.questionsAnswered.toLocaleString()} />
          <StatRow label="Accuracy Rate" value={`${stats.accuracyRate}%`} />
          <StatRow label="Lessons Completed" value={stats.lessonsCompleted.toString()} />
          <StatRow label="Study Hours" value={`${stats.totalStudyHours}h`} />
          <StatRow label="Current Streak" value={`${stats.currentStreak} days`} />
          <StatRow label="Longest Streak" value={`${stats.longestStreak} days`} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500" /> XP System
        </h3>
        <div className="space-y-2 text-sm">
          {Object.entries(XP_REWARDS).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">+{value} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RankingsTab({ leaderboard, userUid, userRanking }: { leaderboard: LeaderboardEntry[]; userUid: string; userRanking: UserRanking | null }) {
  const [filter, setFilter] = useState<'global' | 'country' | 'friends'>('global');

  const filteredBoard = useMemo(() => {
    switch (filter) {
      case 'country':
        return userRanking?.country ? leaderboard.filter((e) => e.country === userRanking.country) : leaderboard;
      case 'friends':
        return leaderboard.slice(0, 10);
      default:
        return leaderboard;
    }
  }, [filter, leaderboard, userRanking]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1">
        {(['global', 'country', 'friends'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
              filter === f ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filteredBoard.length === 0 ? (
          <div className="text-center py-8">
            <Users size={40} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No rankings yet</p>
          </div>
        ) : (
          filteredBoard.slice(0, 50).map((entry, idx) => {
            const isCurrentUser = entry.uid === userUid;
            return (
              <div
                key={entry.uid}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700' : 'bg-white dark:bg-gray-800'
                }`}
              >
                <div className="w-6 text-center">
                  {idx < 3 ? (
                    <Trophy size={16} className={idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-amber-600'} fill="currentColor" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">#{entry.rank}</span>
                  )}
                </div>
                {entry.photoURL ? (
                  <img src={entry.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate text-sm">
                      {entry.displayName || 'Anonymous'}
                    </span>
                    <TierBadge tier={entry.tier} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Lv. {entry.level}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{entry.totalXP.toLocaleString()} XP</div>
                  {filter === 'country' && entry.country && (
                    <div className="text-xs text-gray-400">{entry.country}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BadgesTab({ stats, displayRank }: { stats: UserStatistics; displayRank: number }) {
  const badges = useMemo(() => checkBadges(stats, displayRank), [stats, displayRank]);
  const categories = ['learning', 'streak', 'multiplayer', 'fenbot', 'community', 'global'] as const;
  const [expandedCat, setExpandedCat] = useState<string | null>('learning');

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{unlockedCount} / {badges.length}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Badges Earned</div>
      </div>

      {categories.map((cat) => {
        const catBadges = badges.filter((b) => b.category === cat);
        const catUnlocked = catBadges.filter((b) => b.unlocked).length;
        const isExpanded = expandedCat === cat;

        return (
          <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2 capitalize">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{cat}</span>
                <span className="text-xs text-gray-400">{catUnlocked}/{catBadges.length}</span>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                {catBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border ${
                      badge.unlocked
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{badge.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MissionsTab({ userRanking }: { userRanking: UserRanking | null }) {
  const missions = getWeeklyMissions();
  const dailyRewards = getDailyRewards();
  const [showDaily, setShowDaily] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Target size={16} className="text-red-500" /> Weekly Missions
        </h3>
        <div className="space-y-3">
          {missions.map((mission) => (
            <div key={mission.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{mission.title}</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">+{mission.xpReward} XP</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{mission.description}</p>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                  style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{mission.current}/{mission.target}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowDaily(!showDaily)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-yellow-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-100">Daily Rewards</span>
          </div>
          {showDaily ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {showDaily && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {dailyRewards.map((reward) => (
                <div key={reward.day} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-100">Day {reward.day}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">+{reward.xp} XP</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">+{reward.coins} coins</div>
                  {reward.special && (
                    <div className="text-xs text-red-500 mt-1">{reward.special}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonTab() {
  const season = getCurrentSeason();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800 text-center">
        <Crown size={32} className="mx-auto mb-2 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{season.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Season Rankings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2"><Globe size={14} /> Global</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">#—</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2"><MapPin size={14} /> Country</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">#—</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2"><School size={14} /> School</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">#—</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2"><Users size={14} /> Friends</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">#—</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Season Rewards</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <span className="text-lg">🥇</span>
            <div>
              <div className="font-medium text-gray-800 dark:text-gray-100">1st Place</div>
              <div className="text-xs text-gray-500">Gold Badge + 1000 XP + Exclusive Avatar</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-lg">🥈</span>
            <div>
              <div className="font-medium text-gray-800 dark:text-gray-100">Top 10</div>
              <div className="text-xs text-gray-500">Silver Badge + 500 XP</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <span className="text-lg">🥉</span>
            <div>
              <div className="font-medium text-gray-800 dark:text-gray-100">Top 100</div>
              <div className="text-xs text-gray-500">Bronze Badge + 250 XP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const icon = RANK_TIER_ICONS[tier as keyof typeof RANK_TIER_ICONS] || '🟤';
  const color = RANK_TIER_COLORS[tier as keyof typeof RANK_TIER_COLORS] || '#cd7f32';
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span>{icon}</span>
    </span>
  );
}
