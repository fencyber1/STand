import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords, Users, Trophy, Zap, Crown, Clock, Target,
  Flame, Timer, Award, TrendingUp, Play, Search, Plus,
  X, LogIn, UserCheck, AlertCircle, Eye,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToActiveGames,
  getAllGameModes,
  createGameRoom,
  joinGameRoom,
  joinByCode,
  getPlayerStats,
} from '../../services/multiplayer/multiplayerService';
import { subscribeToUserRanking, getRankIcon, getRankColor } from '../../services/rankingService';
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
  const [debug, setDebug] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinModalError, setJoinModalError] = useState('');
  const [hostLevels, setHostLevels] = useState<Record<string, number>>({});

  const gameModes = getAllGameModes();

  useEffect(() => {
    if (!activeGames.length) return;
    const fetchHostLevels = async () => {
      const levels: Record<string, number> = {};
      for (const game of activeGames) {
        if (game.host && !levels[game.host]) {
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const { db: firestoreDb } = await import('../../services/firebase');
            const snap = await getDoc(doc(firestoreDb, 'rankings', game.host));
            if (snap.exists()) {
              levels[game.host] = snap.data().level || 1;
            }
          } catch {}
        }
      }
      setHostLevels(levels);
    };
    fetchHostLevels();
  }, [activeGames]);

  useEffect(() => {
    const unsub = subscribeToActiveGames((rooms) => {
      console.log('[MP] Active games received:', rooms.length);
      setActiveGames(rooms);
      setDebug(`Last update: ${new Date().toLocaleTimeString()} | Games: ${rooms.length}`);
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
        console.log('[MP] Navigating to:', `/multiplayer/${roomId}`);
        navigate(`/multiplayer/${roomId}`);
        setTimeout(() => {
          if (window.location.pathname === '/multiplayer') {
            console.log('[MP] Navigation failed, using href fallback');
            window.location.href = `/multiplayer/${roomId}`;
          }
        }, 1000);
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

  const handleJoinRoom = async () => {
    if (!user || !selectedRoom) return;
    setJoining(true);
    setJoinModalError('');
    try {
      const result = await joinGameRoom(selectedRoom.id, {
        uid: user.uid,
        name: user.fullName || 'Player',
        photo: user.photoURL,
      });
      if (result.success) {
        navigate(`/multiplayer/${selectedRoom.id}`);
      } else {
        setJoinModalError(result.error || 'Failed to join room');
      }
    } catch (e: any) {
      setJoinModalError(e.message || 'Failed to join room');
    } finally {
      setJoining(false);
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
          {gameModes.map(({ mode, label, icon, description, questions, time, xpReward }) => (
            <button
              key={mode}
              onClick={() => handleCreateGame(mode)}
              disabled={creating}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{label}</span>
              </div>
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
            {gameModes.map(({ mode, label, icon, questions, time, maxPlayers, xpReward }) => (
              <button
                key={mode}
                onClick={() => handleCreateGame(mode)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{questions} questions, {time}s each, {maxPlayers} players</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">+{xpReward} XP</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Active Games</h3>
          <button onClick={() => { setActiveGames([]); setDebug('Refreshing...'); }} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Refresh</button>
        </div>
        {debug && <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{debug}</p>}
        {activeGames.length === 0 ? (
          <div className="text-center py-6">
            <Swords size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active games. Create one!</p>
          </div>
        ) : (
           <div className="space-y-2">
             {activeGames.slice(0, 10).map((game) => {
               const isFull = game.players.length >= game.maxPlayers;
               const isLive = game.status === 'in_progress' || game.status === 'finished';
               const spectatorCount = game.spectators?.length || 0;
               const hostLevel = hostLevels[game.host] || 1;

               return (
                 <button
                   key={game.id}
                   onClick={() => { setSelectedRoom(game); setJoinModalError(''); }}
                   className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${game.status === 'waiting' ? 'bg-green-500' : game.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
                     <div className="text-left">
                       <div className="flex items-center gap-1">
                         <span
                           className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                           style={{ backgroundColor: getRankColor(hostLevel), border: '1px solid white' }}
                         >
                           {getRankIcon(hostLevel)}
                         </span>
                         <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                           {game.hostName}'s Game
                           {isLive && <span className="ml-1 text-xs text-yellow-500">● LIVE</span>}
                         </span>
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                         {game.mode} • {game.players.length}/{game.maxPlayers} players
                         {spectatorCount > 0 && <span className="ml-1 text-purple-400">• {spectatorCount} watching</span>}
                       </div>
                     </div>
                   </div>
                   <div className="text-xs text-gray-400">
                     {game.status === 'waiting' ? (isFull ? 'Full' : 'Waiting') : game.status === 'in_progress' ? 'In Progress' : 'Finished'}
                   </div>
                 </button>
               );
             })}
          </div>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setSelectedRoom(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Game Room</h3>
              <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Host</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedRoom.hostName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Mode</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">{selectedRoom.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Players</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedRoom.players.length}/{selectedRoom.maxPlayers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                <span className={`text-sm font-medium ${selectedRoom.status === 'waiting' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {selectedRoom.status === 'waiting' ? 'Waiting' : 'In Progress'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Subject</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedRoom.subject}</span>
              </div>
              {selectedRoom.roomCode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Room Code</span>
                  <span className="text-sm font-mono font-bold text-primary-600 dark:text-primary-400">{selectedRoom.roomCode}</span>
                </div>
              )}
            </div>

            {joinModalError && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600 dark:text-red-400">{joinModalError}</span>
              </div>
            )}

            {selectedRoom.host === user?.uid ? (
              <div className="space-y-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">This is your room (host)</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}`)}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Enter Room
                </button>
              </div>
            ) : selectedRoom.players.some((p) => p.uid === user?.uid) ? (
              <div className="space-y-2">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                  <UserCheck size={14} className="text-green-500 shrink-0" />
                  <span className="text-xs text-green-600 dark:text-green-400">You're already in this room</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}`)}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Enter Room
                </button>
              </div>
            ) : selectedRoom.status === 'waiting' && selectedRoom.players.length >= selectedRoom.maxPlayers ? (
              <div className="space-y-2">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">Room is full — Spectate instead!</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}?spectate=true`)}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> SPECTATE
                </button>
              </div>
            ) : selectedRoom.status !== 'waiting' ? (
              <div className="space-y-2">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">Game in progress — Watch live!</span>
                </div>
                <button
                  onClick={() => navigate(`/multiplayer/${selectedRoom.id}?spectate=true`)}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> SPECTATE LIVE
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinRoom}
                disabled={joining}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn size={16} /> JOIN GAME
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
