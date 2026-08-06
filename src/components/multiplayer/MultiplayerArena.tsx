import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords, Users, Trophy, Zap, Crown, Clock, Target,
  Flame, Timer, Award, TrendingUp, Play, Search, Plus,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToActiveGames,
  getAllGameModes,
  createGameRoom,
  joinByCode,
  getPlayerStats,
} from '../../services/multiplayer/multiplayerService';
import { subscribeToUserRanking } from '../../services/rankingService';
import type { GameRoom, GameMode, PlayerStats, UserRanking } from '../../types';

export default function MultiplayerArena() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeGames, setActiveGames] = useState<GameRoom[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lastMode, setLastMode] = useState<GameMode>('1v1');

  const gameModes = getAllGameModes();

  useEffect(() => {
    const unsub = subscribeToActiveGames((rooms) => {
      setActiveGames(rooms);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getPlayerStats(user.uid).then(setPlayerStats);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserRanking(user.uid, setUserRanking);
    return () => unsub();
  }, [user?.uid]);

  const handleCreateGame = async (mode: GameMode) => {
    if (!user) {
      setCreateError('Please log in to create a game room');
      return;
    }
    setLastMode(mode);
    setCreating(true);
    setCreateError('');
    try {
      console.log('[MP] Creating room with mode:', mode);
      const roomId = await createGameRoom({
        host: { uid: user.uid, name: user.fullName || 'Player', photo: user.photoURL },
        mode,
        subject: 'Mixed',
        topic: 'Mixed',
        difficulty: 'mixed',
        isPrivate: mode === '1v1',
      });
      console.log('[MP] Room created:', roomId);
      if (roomId) {
        navigate(`/multiplayer/${roomId}`);
      } else {
        setCreateError('Failed to create room. Please try again.');
      }
    } catch (e: any) {
      console.error('[MP] Create room error:', e);
      setCreateError(e.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!user || !joinCode.trim()) return;
    setJoinError('');
    const result = await joinByCode(joinCode.trim().toUpperCase(), {
      uid: user.uid,
      name: user.fullName || 'Player',
      photo: user.photoURL,
    });
    if (result.success && result.roomId) {
      navigate(`/multiplayer/${result.roomId}`);
    } else {
      setJoinError(result.error || 'Failed to join');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Multiplayer Arena</h1>
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 text-sm">
          {t('Back')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{playerStats?.matchesPlayed || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Matches</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">{playerStats?.wins || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Wins</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{playerStats?.winRate || 0}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
        </div>
      </div>

      {creating && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-600 dark:text-blue-400">Creating room...</span>
        </div>
      )}

      {createError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="text-sm text-red-600 dark:text-red-400">{createError}</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setCreateError('')}
              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleCreateGame(lastMode)}
              className="text-xs px-2 py-1 bg-primary-600 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Quick Play</h3>
        <div className="grid grid-cols-2 gap-2">
          {gameModes.map(({ mode, label, description, questions, time, xpReward }) => (
            <button
              key={mode}
              onClick={() => handleCreateGame(mode)}
              disabled={creating}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{questions}Q</span>
                <span>{time}s</span>
                <span className="text-purple-500">+{xpReward} XP</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setShowJoinCode(true); setShowCreate(false); setJoinError(''); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-600 transition"
        >
          <Search size={16} /> Join with Code
        </button>
        <button
          onClick={() => { setShowCreate(true); setShowJoinCode(false); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
        >
          <Plus size={16} /> Create Room
        </button>
      </div>

      {showJoinCode && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Enter Room Code</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-center text-lg font-mono tracking-widest text-gray-800 dark:text-gray-100 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleJoinWithCode}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
            >
              Join
            </button>
          </div>
          {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
        </div>
      )}

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Create Game Room</h3>
          <div className="space-y-2">
            {gameModes.map(({ mode, label, questions, time, maxPlayers, xpReward }) => (
              <button
                key={mode}
                onClick={() => handleCreateGame(mode)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="text-left">
                  <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{questions} questions, {time}s each, {maxPlayers} players</div>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">+{xpReward} XP</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Active Games</h3>
        {activeGames.length === 0 ? (
          <div className="text-center py-6">
            <Swords size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active games. Create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeGames.slice(0, 10).map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/multiplayer/${game.id}`)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${game.status === 'waiting' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                      {game.hostName}'s Game
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {game.mode} • {game.players.length}/{game.maxPlayers} players
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {game.status === 'waiting' ? 'Waiting' : 'In Progress'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
