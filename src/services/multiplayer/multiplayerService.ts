import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Question, GameRoom, GamePlayer, PlayerAnswer, GameMode, GameStatus, GameDifficulty, GameReward, GameChatMessage, TournamentBracket, TournamentRound, TournamentMatch, PlayerStats, MatchResult } from '../../types';

function ts(): string {
  return new Date().toISOString();
}

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined) clean[k] = sanitize(v); }
  return clean;
}

export { type GameMode, type GameStatus, type GameDifficulty } from '../../types';

const GAME_MODE_CONFIG: Record<GameMode, { label: string; description: string; questions: number; time: number; maxPlayers: number; xpReward: number; coinReward: number }> = {
  '1v1': { label: '1v1 Battle', description: 'Head-to-head quiz battle', questions: 20, time: 30, maxPlayers: 2, xpReward: 150, coinReward: 50 },
  'team': { label: 'Team Battle', description: 'Team vs team competition', questions: 25, time: 25, maxPlayers: 10, xpReward: 200, coinReward: 75 },
  'tournament': { label: 'Tournament', description: 'Single elimination bracket', questions: 15, time: 20, maxPlayers: 16, xpReward: 500, coinReward: 200 },
  'blitz': { label: 'Blitz Mode', description: '10 questions in 60 seconds', questions: 10, time: 6, maxPlayers: 2, xpReward: 100, coinReward: 40 },
  'marathon': { label: 'Marathon', description: '100 challenging questions', questions: 100, time: 15, maxPlayers: 2, xpReward: 300, coinReward: 100 },
  'survival': { label: 'Survival', description: 'One wrong answer eliminates you', questions: 50, time: 20, maxPlayers: 4, xpReward: 250, coinReward: 80 },
  'speedrun': { label: 'Speed Run', description: 'Fast and accurate wins', questions: 15, time: 10, maxPlayers: 2, xpReward: 180, coinReward: 60 },
};

export function getGameModeConfig(mode: GameMode) {
  return GAME_MODE_CONFIG[mode];
}

export function getAllGameModes() {
  return Object.entries(GAME_MODE_CONFIG).map(([key, config]) => ({
    mode: key as GameMode,
    ...config,
  }));
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGameRoom(params: {
  host: { uid: string; name: string; photo: string | null };
  mode: GameMode;
  subject: string;
  topic: string;
  difficulty: GameDifficulty;
  isPrivate?: boolean;
}): Promise<string> {
    try {
      const ref = doc(collection(db, 'gameRooms'));
      const config = GAME_MODE_CONFIG[params.mode];
      const roomCode = params.isPrivate || params.mode === '1v1' ? generateRoomCode() : undefined;

      const room: any = {
        id: ref.id,
        mode: params.mode,
        status: 'waiting',
        host: params.host.uid,
        hostName: params.host.name,
        players: [{
          uid: params.host.uid,
          displayName: params.host.name,
          photoURL: params.host.photo,
          score: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          answers: [],
          ready: false,
          connected: true,
          finished: false,
          streak: 0,
          bestStreak: 0,
          totalTime: 0,
        }],
        maxPlayers: config.maxPlayers,
        subject: params.subject,
        topic: params.topic,
        difficulty: params.difficulty,
        totalQuestions: config.questions,
        timePerQuestion: config.time,
        currentQuestion: 0,
        questions: [],
        answers: {},
        spectators: [],
        rewards: { xp: config.xpReward, coins: config.coinReward },
        isPrivate: params.isPrivate || false,
        roomCode,
        createdAt: ts(),
        liveChat: [],
      };

      const writePromise = setDoc(ref, sanitize(room));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 5000)
      );
      await Promise.race([writePromise, timeoutPromise]);
      return ref.id;
    } catch (e: any) {
      console.error('[MP] Failed to create game room:', e);
      if (e.message === 'CONNECTION_TIMEOUT' || e.code === 'unavailable') {
        throw new Error('Cannot reach Firebase. Check your internet connection.');
      }
      if (e.code === 'permission-denied') {
        throw new Error('Permission denied. Firestore rules may not allow this.');
      }
      if (e.code === 'unauthenticated') {
        throw new Error('Not authenticated. Please log in again.');
      }
      throw new Error(e.message || 'Failed to create room');
    }
  }

export async function joinGameRoom(roomId: string, player: { uid: string; name: string; photo: string | null }): Promise<{ success: boolean; error?: string }> {
  try {
    const ref = doc(db, 'gameRooms', roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: 'Room not found' };

    const room = snap.data() as GameRoom;
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
    if (room.players.some((p) => p.uid === player.uid)) return { success: false, error: 'Already in room' };

    const newPlayer: GamePlayer = {
      uid: player.uid,
      displayName: player.name,
      photoURL: player.photo,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      answers: [],
      ready: false,
      connected: true,
      finished: false,
      streak: 0,
      bestStreak: 0,
      totalTime: 0,
    };

    await updateDoc(ref, {
      players: [...room.players, newPlayer],
      liveChat: [...room.liveChat, {
        uid: 'system',
        name: 'System',
        text: `${player.name} joined the game`,
        timestamp: ts(),
        type: 'system',
      }],
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to join' };
  }
}

export async function joinByCode(roomCode: string, player: { uid: string; name: string; photo: string | null }): Promise<{ success: boolean; roomId?: string; error?: string }> {
  try {
    const snap = await getDocs(query(collection(db, 'gameRooms'), where('roomCode', '==', roomCode)));
    if (snap.empty) return { success: false, error: 'Invalid room code' };

    const roomDoc = snap.docs[0];
    const result = await joinGameRoom(roomDoc.id, player);
    return { ...result, roomId: roomDoc.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setPlayerReady(roomId: string, uid: string, ready: boolean): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  const players = room.players.map((p) => p.uid === uid ? { ...p, ready } : p);
  await updateDoc(ref, { players });
}

export async function startGame(roomId: string, questions: Question[]): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await updateDoc(ref, {
    status: 'in_progress',
    questions,
    currentQuestion: 0,
    startedAt: ts(),
    liveChat: [],
  });
}

export async function submitAnswer(
  roomId: string,
  uid: string,
  questionIndex: number,
  answer: string | string[],
  timeSpent: number,
  isCorrect: boolean,
): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  const points = calculateAnswerPoints(isCorrect, timeSpent, room.timePerQuestion);

  const playerAnswer: PlayerAnswer = {
    questionId: room.questions[questionIndex]?.id || '',
    answer,
    correct: isCorrect,
    timeSpent,
    points,
  };

  const players = room.players.map((p) => {
    if (p.uid !== uid) return p;
    const newStreak = isCorrect ? p.streak + 1 : 0;
    return {
      ...p,
      score: p.score + points,
      correctAnswers: p.correctAnswers + (isCorrect ? 1 : 0),
      totalAnswers: p.totalAnswers + 1,
      answers: [...p.answers, playerAnswer],
      streak: newStreak,
      bestStreak: Math.max(p.bestStreak, newStreak),
      totalTime: p.totalTime + timeSpent,
    };
  });

  const answers = { ...room.answers };
  if (!answers[uid]) answers[uid] = {};
  answers[uid][questionIndex.toString()] = playerAnswer;

  await updateDoc(ref, { players, answers: sanitize(answers) });
}

function calculateAnswerPoints(correct: boolean, timeSpent: number, maxTime: number): number {
  if (!correct) return 0;
  const basePoints = 100;
  const timeBonus = Math.round((1 - timeSpent / maxTime) * 50);
  return basePoints + Math.max(0, timeBonus);
}

export async function nextQuestion(roomId: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  const nextQ = room.currentQuestion + 1;

  if (nextQ >= room.totalQuestions) {
    await endGame(roomId);
  } else {
    await updateDoc(ref, { currentQuestion: nextQ });
  }
}

export async function endGame(roomId: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const rankedPlayers = sortedPlayers.map((p, idx) => ({ ...p, rank: idx + 1 }));
  const winner = rankedPlayers[0]?.uid;

  await updateDoc(ref, {
    status: 'finished',
    players: rankedPlayers,
    winner,
    endedAt: ts(),
  });
}

export async function leaveGame(roomId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  const players = room.players.filter((p) => p.uid !== uid);
  if (players.length === 0) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { players });
  }
}

export async function sendChatMessage(roomId: string, message: Omit<GameChatMessage, 'timestamp'>): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  await updateDoc(ref, {
    liveChat: [...room.liveChat.slice(-99), { ...message, timestamp: ts() }],
  });
}

export async function addSpectator(roomId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as GameRoom;
  if (!room.spectators.includes(uid)) {
    await updateDoc(ref, { spectators: [...room.spectators, uid] });
  }
}

export function subscribeToGameRoom(roomId: string, cb: (room: GameRoom | null) => void): () => void {
  return onSnapshot(doc(db, 'gameRooms', roomId), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    cb(snap.data() as GameRoom);
  }, (err) => {
    console.error('Game room listener error:', err);
    cb(null);
  });
}

export function subscribeToActiveGames(cb: (rooms: GameRoom[]) => void): () => void {
  const q = query(collection(db, 'gameRooms'), where('status', 'in', ['waiting', 'in_progress']), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as GameRoom));
  }, () => cb([]));
}

export async function getPlayerStats(uid: string): Promise<PlayerStats> {
  try {
    const snap = await getDoc(doc(db, 'playerStats', uid));
    if (!snap.exists()) return getDefaultPlayerStats(uid);
    return snap.data() as PlayerStats;
  } catch {
    return getDefaultPlayerStats(uid);
  }
}

export async function updatePlayerStats(uid: string, stats: Partial<PlayerStats>): Promise<void> {
  const ref = doc(db, 'playerStats', uid);
  await setDoc(ref, sanitize(stats), { merge: true });
}

export async function recordMatchResult(uid: string, result: MatchResult): Promise<void> {
  const stats = await getPlayerStats(uid);
  const newStats: PlayerStats = {
    ...stats,
    matchesPlayed: stats.matchesPlayed + 1,
    wins: stats.wins + (result.result === 'win' ? 1 : 0),
    losses: stats.losses + (result.result === 'loss' ? 1 : 0),
    draws: stats.draws + (result.result === 'draw' ? 1 : 0),
    totalXPEarned: stats.totalXPEarned + result.xpEarned,
    winRate: stats.matchesPlayed > 0 ? Math.round(((stats.wins + (result.result === 'win' ? 1 : 0)) / (stats.matchesPlayed + 1)) * 100) : 0,
    matchHistory: [result, ...stats.matchHistory.slice(0, 49)],
  };
  await updatePlayerStats(uid, newStats);
}

function getDefaultPlayerStats(uid: string): PlayerStats {
  return {
    uid,
    displayName: '',
    photoURL: null,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    fastestAnswer: 0,
    accuracy: 0,
    tournamentWins: 0,
    globalRank: 0,
    totalXPEarned: 0,
    totalCoinsEarned: 0,
    streak: 0,
    longestStreak: 0,
    favoriteSubject: '',
    matchHistory: [],
  };
}

export async function createTournament(params: {
  name: string;
  mode: GameMode;
  subject: string;
  maxPlayers: number;
  host: { uid: string; name: string; photo: string | null };
}): Promise<string> {
  const ref = doc(collection(db, 'gameRooms'));
  const config = GAME_MODE_CONFIG[params.mode];

  const bracket: TournamentBracket = {
    rounds: [],
    currentRound: 0,
  };

  const room: any = {
    id: ref.id,
    mode: 'tournament',
    status: 'waiting',
    host: params.host.uid,
    hostName: params.host.name,
    players: [{
      uid: params.host.uid,
      displayName: params.host.name,
      photoURL: params.host.photo,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      answers: [],
      ready: false,
      connected: true,
      finished: false,
      streak: 0,
      bestStreak: 0,
      totalTime: 0,
    }],
    maxPlayers: params.maxPlayers,
    subject: params.subject,
    topic: 'Mixed',
    difficulty: 'mixed',
    totalQuestions: config.questions,
    timePerQuestion: config.time,
    currentQuestion: 0,
    questions: [],
    answers: {},
    spectators: [],
    rewards: { xp: config.xpReward * 2, coins: config.coinReward * 2 },
    isPrivate: false,
    createdAt: ts(),
    liveChat: [],
    bracket,
  };

  await setDoc(ref, sanitize(room));
  return ref.id;
}

export function generateBracket(players: GamePlayer[]): TournamentBracket {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const rounds: TournamentRound[] = [];
  let matchesInRound = Math.floor(shuffled.length / 2);

  while (matchesInRound >= 1) {
    const round: TournamentRound = { matches: [] };
    for (let i = 0; i < matchesInRound; i++) {
      round.matches.push({
        id: `match-${rounds.length}-${i}`,
        player1: shuffled[i * 2]?.uid || '',
        player2: shuffled[i * 2 + 1]?.uid || '',
        score1: 0,
        score2: 0,
        status: 'pending',
      });
    }
    rounds.push(round);
    matchesInRound = Math.floor(matchesInRound / 2);
  }

  return { rounds, currentRound: 0 };
}
