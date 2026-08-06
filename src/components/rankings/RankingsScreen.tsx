import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trophy, Zap, Calendar, TrendingUp, Users, Hash } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import {
  subscribeToLeaderboard,
  subscribeToUserRanking,
  RANK_TIER_COLORS,
  RANK_TIER_ICONS,
  getLevelForXP,
  getXPToNextLevel,
  getTierForXP,
  getXPToNextTier,
  getXPForTier,
} from '../../services/rankingService';
import type { LeaderboardEntry, UserRanking, LeaderboardType, RankTier } from '../../types';
import BorderGlow from '../ui/BorderGlow';

const LEADERBOARD_TABS: { id: LeaderboardType; label: string; icon: any }[] = [
  { id: 'overall', label: 'Overall', icon: Trophy },
  { id: 'weekly', label: 'This Week', icon: Zap },
  { id: 'streak', label: 'Streak', icon: Calendar },
];

function TierBadge({ tier }: { tier: RankTier }) {
  const icon = RANK_TIER_ICONS[tier] || '🟤';
  const color = RANK_TIER_COLORS[tier] || '#cd7f32';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}20`, color: color }}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{tier}</span>
    </span>
  );
}

function Avatar({ url, size }: { url: string | null; size: number }) {
  if (url) {
    return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      ?
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={20} className="text-yellow-400" fill="currentColor" />;
  if (rank === 2) return <Trophy size={20} className="text-gray-300" fill="currentColor" />;
  if (rank === 3) return <Trophy size={20} className="text-amber-600" fill="currentColor" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400 dark:text-gray-500">#{rank}</span>;
}

export default function RankingsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [loading, setLoading] = useState(true);

  const unsubLeaderboardRef = useRef<(() => void) | null>(null);
  const unsubUserRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubLeaderboardRef.current) unsubLeaderboardRef.current();
    setLoading(true);
    unsubLeaderboardRef.current = subscribeToLeaderboard(activeTab, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => {
      if (unsubLeaderboardRef.current) unsubLeaderboardRef.current();
    };
  }, [activeTab]);

  useEffect(() => {
    if (!user?.uid) {
      setUserRanking(null);
      return;
    }
    unsubUserRef.current = subscribeToUserRanking(user.uid, (data) => {
      setUserRanking(data);
    });
    return () => {
      if (unsubUserRef.current) unsubUserRef.current();
    };
  }, [user?.uid]);

  const userRankEntry = useMemo(() => {
    if (!userRanking) return null;
    return entries.find((e) => e.uid === user?.uid) || null;
  }, [entries, userRanking, user?.uid]);

  const displayRank = useMemo(() => {
    if (userRankEntry) return userRankEntry.rank;
    if (userRanking?.rank) return userRanking.rank;
    return 0;
  }, [userRankEntry, userRanking]);

  const handleTabChange = (tab: LeaderboardType) => {
    setActiveTab(tab);
  };

  const getUserStat = (key: string) => {
    if (!userRanking) return 0;
    return (userRanking as any)[key] || 0;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center gap-1"
        >
          <ArrowLeft size={14} /> {t('Back')}
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Rankings')}</h1>
        <div style={{ width: 80 }} />
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1">
        {LEADERBOARD_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-md text-sm font-medium transition-all ${
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

      {loading && entries.length === 0 && (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Loading leaderboard...')}</p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">{t('No users ranked yet.')}</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-1 mb-6">
          {entries.map((entry, idx) => {
            const isCurrentUser = entry.uid === user?.uid;
            const isTop3 = entry.rank <= 3;
            const tier = entry.tier as RankTier;

            return (
              <BorderGlow
                key={entry.uid}
                backgroundColor="#1f2937"
                borderRadius={10}
                glowColor={isCurrentUser ? '140 200 80' : '100 100 100'}
                glowRadius={isCurrentUser ? 15 : 5}
                glowIntensity={isCurrentUser ? 0.3 : 0.1}
                edgeSensitivity={25}
                colors={isCurrentUser ? ['#22c55e', '#16a34a', '#15803d'] : ['#6b7280', '#4b5563', '#374151']}
              >
                <div
                  className={`p-3 rounded-lg transition-colors flex items-center gap-3 ${
                    isCurrentUser
                      ? 'bg-violet-500/15 dark:bg-violet-500/20'
                      : isTop3
                      ? 'bg-yellow-50 dark:bg-yellow-900/10'
                      : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="w-8 flex justify-center">{RankMedal({ rank: entry.rank })}</div>

                  <Avatar url={entry.photoURL} size={40} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold text-gray-800 dark:text-gray-100 truncate ${
                          entry.rank <= 3 ? 'text-yellow-600 dark:text-yellow-400' : ''
                        }`}
                      >
                        {entry.displayName || t('Anonymous')}
                      </span>
                      <TierBadge tier={tier} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <TrendingUp size={12} /> L{entry.level}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Zap size={12} /> {entry.totalXP.toLocaleString()} XP
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>Rank #{entry.rank}</div>
                    {activeTab === 'weekly' && (
                      <div className="text-purple-400 font-medium">{entry.weeklyXP} XP</div>
                    )}
                    {activeTab === 'streak' && (
                      <div className="text-orange-400 font-medium">{entry.currentStreak} 🔥</div>
                    )}
                  </div>
                </div>
              </BorderGlow>
            );
          })}
        </div>
      )}

      {displayRank > 0 && (
        <div className="mt-6 mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('Your Position')}</h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 flex justify-center">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-violet-400">#{displayRank}</span>
                </div>
              </div>

              <Avatar url={userRanking?.photoURL || null} size={44} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {storage.getDisplayName() || user?.fullName || t('You')}
                  </span>
                  <TierBadge tier={userRanking?.tier || 'Bronze'} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>Lv. {userRanking?.level || 1}</span>
                  <span>{(userRanking?.totalXP || 0).toLocaleString()} XP</span>
                </div>
              </div>

              {userRanking && (
                <div className="text-right">
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((userRanking.totalXP || 0) - getXPForTier(userRanking.tier || 'Bronze')) / Math.max(1, getXPToNextTier(userRanking.totalXP || 0)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getXPToNextTier(userRanking.totalXP || 0) > 0
                      ? `${getXPToNextTier(userRanking.totalXP || 0)} XP to next tier`
                      : 'Mythic tier!'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
