import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
  writeBatch, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { addXP } from '../rankingService';
import type { Question, GameRoom, GamePlayer, PlayerAnswer, GameMode, GameStatus, GameDifficulty, GameReward, GameChatMessage, TournamentBracket, TournamentRound, TournamentMatch, PlayerStats, MatchResult } from '../../types';

const ROOM_TIMEOUT_MS = 3 * 60 * 1000;

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

const GAME_MODE_CONFIG: Record<GameMode, { label: string; description: string; icon: string; questions: number; time: number; maxPlayers: number; xpReward: number; coinReward: number }> = {
  '1v1': { label: '1v1 Battle', description: 'Head-to-head quiz battle', icon: '⚔️', questions: 20, time: 30, maxPlayers: 2, xpReward: 150, coinReward: 50 },
  'team': { label: 'Team Battle', description: 'Team vs team competition', icon: '👥', questions: 25, time: 25, maxPlayers: 10, xpReward: 200, coinReward: 75 },
  'tournament': { label: 'Tournament', description: 'Single elimination bracket', icon: '🏆', questions: 15, time: 20, maxPlayers: 16, xpReward: 500, coinReward: 200 },
  'blitz': { label: 'Blitz Mode', description: '10 questions in 60 seconds', icon: '⚡', questions: 10, time: 6, maxPlayers: 2, xpReward: 100, coinReward: 40 },
  'marathon': { label: 'Marathon', description: '100 challenging questions', icon: '🏃', questions: 100, time: 15, maxPlayers: 2, xpReward: 300, coinReward: 100 },
  'survival': { label: 'Survival', description: 'One wrong answer eliminates you', icon: '💀', questions: 50, time: 20, maxPlayers: 4, xpReward: 250, coinReward: 80 },
  'speedrun': { label: 'Speed Run', description: 'Fast and accurate wins', icon: '🚀', questions: 15, time: 10, maxPlayers: 2, xpReward: 180, coinReward: 60 },
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
  const config = GAME_MODE_CONFIG[params.mode];
  if (!config) throw new Error('Invalid game mode');

  try {
    const ref = doc(collection(db, 'gameRooms'));
    const needsCode = params.isPrivate || params.mode === '1v1';
    let roomCode: string | undefined;

    if (needsCode) {
      let attempts = 0;
      let isUnique = false;
      while (!isUnique && attempts < 10) {
        const candidate = generateRoomCode();
        const existing = await getDocs(query(collection(db, 'gameRooms'), where('roomCode', '==', candidate)));
        if (existing.empty) {
          roomCode = candidate;
          isUnique = true;
        }
        attempts++;
      }
      if (!roomCode) roomCode = generateRoomCode();
    }

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
      roomCode: roomCode || null,
      createdAt: ts(),
      expiresAt: Date.now() + ROOM_TIMEOUT_MS,
      liveChat: [],
    };

    const writePromise = setDoc(ref, sanitize(room));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 15000)
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

    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return { success: false, error: 'Room not found' };

      const room = snap.data() as GameRoom;
      if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
      if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
      if (room.players.some((p) => p.uid === player.uid)) return { success: false, error: 'Already in room' };
      if (room.expiresAt && room.expiresAt < Date.now()) return { success: false, error: 'Room expired' };

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

      transaction.update(ref, {
        players: [...room.players, newPlayer],
        liveChat: [...room.liveChat.slice(-99), {
          uid: 'system',
          name: 'System',
          text: `${player.name} joined the game`,
          timestamp: ts(),
          type: 'system',
        }],
      });

      return { success: true };
    });
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to join' };
  }
}

export async function joinByCode(roomCode: string, player: { uid: string; name: string; photo: string | null }): Promise<{ success: boolean; roomId?: string; error?: string }> {
  try {
    const snap = await getDocs(query(collection(db, 'gameRooms'), where('roomCode', '==', roomCode), where('status', '==', 'waiting')));
    if (snap.empty) return { success: false, error: 'Invalid room code or game already started' };

    const roomDoc = snap.docs[0];
    const result = await joinGameRoom(roomDoc.id, player);
    return { ...result, roomId: roomDoc.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setPlayerReady(roomId: string, uid: string, ready: boolean): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    const players = room.players.map((p) => p.uid === uid ? { ...p, ready } : p);
    transaction.update(ref, { players });
  });
}

export async function startGame(roomId: string, questions: Question[]): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    if (room.status !== 'waiting') return;
    transaction.update(ref, {
      status: 'starting',
      questions,
      currentQuestion: 0,
      totalQuestions: questions.length,
      countdown: 5,
      startedAt: ts(),
      liveChat: [],
      genProgress: null,
    });
  });
}

export async function tickCountdown(roomId: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    const currentCount = room.countdown ?? 0;
    if (currentCount <= 1) {
      transaction.update(ref, { countdown: 0, status: 'in_progress' });
    } else {
      transaction.update(ref, { countdown: currentCount - 1 });
    }
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
  let shouldEndGame = false;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as GameRoom;
    if (room.status === 'finished') return;

    const points = calculateAnswerPoints(isCorrect, timeSpent, room.timePerQuestion);

    const playerAnswer: PlayerAnswer = {
      questionId: room.questions[questionIndex]?.id || '',
      answer,
      correct: isCorrect,
      timeSpent,
      points,
    };

    const currentPlayer = room.players.find((p) => p.uid === uid);
    if (currentPlayer?.eliminated) return;

    const players = room.players.map((p) => {
      if (p.uid !== uid) return p;
      const newStreak = isCorrect ? p.streak + 1 : 0;
      const updated = {
        ...p,
        score: p.score + points,
        correctAnswers: p.correctAnswers + (isCorrect ? 1 : 0),
        totalAnswers: p.totalAnswers + 1,
        answers: [...p.answers, playerAnswer],
        streak: newStreak,
        bestStreak: Math.max(p.bestStreak, newStreak),
        totalTime: p.totalTime + timeSpent,
      };

      if (room.mode === 'survival' && !isCorrect) {
        return { ...updated, eliminated: true };
      }
      return updated;
    });

    const answers = { ...room.answers };
    if (!answers[uid]) answers[uid] = {};
    answers[uid][questionIndex.toString()] = playerAnswer;

    transaction.update(ref, { players, answers: sanitize(answers) });

    if (room.mode === 'survival') {
      const aliveAfter = players.filter((p) => !p.eliminated).length;
      if (aliveAfter <= 1) {
        shouldEndGame = true;
      }
    }
  });

  if (shouldEndGame) {
    await endGame(roomId);
  }
}

function calculateAnswerPoints(correct: boolean, timeSpent: number, maxTime: number): number {
  if (!correct) return 0;
  const basePoints = 100;
  const timeBonus = Math.round((1 - timeSpent / maxTime) * 50);
  return basePoints + Math.max(0, timeBonus);
}

export async function nextQuestion(roomId: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  let shouldEndGame = false;
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    if (room.status === 'finished') return;

    const nextQ = room.currentQuestion + 1;
    if (nextQ >= room.totalQuestions) {
      shouldEndGame = true;
    } else {
      transaction.update(ref, { currentQuestion: nextQ });
    }
  });
  if (shouldEndGame) {
    await endGame(roomId);
  }
}

export async function endGame(roomId: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as GameRoom;
    if (room.status === 'finished') return;

    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    const rankedPlayers = sortedPlayers.map((p, idx) => ({ ...p, rank: idx + 1 }));
    const winner = rankedPlayers[0]?.uid;

    transaction.update(ref, {
      status: 'finished',
      players: rankedPlayers,
      winner,
      endedAt: ts(),
    });
  });

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    if (room.status !== 'finished') return;

    for (const player of room.players) {
      const isWinner = player.uid === room.winner;
      const opponent = room.players.find((p) => p.uid !== player.uid);
      const result: MatchResult = {
        id: `${roomId}-${player.uid}`,
        mode: room.mode,
        opponent: opponent?.uid || '',
        opponentName: opponent?.displayName || 'Unknown',
        result: isWinner ? 'win' : opponent ? 'loss' : 'draw',
        score: player.score,
        opponentScore: opponent?.score || 0,
        xpEarned: room.rewards.xp + (isWinner ? 50 : 0),
        date: ts(),
        subject: room.subject,
      };
      await recordMatchResult(player.uid, result);
    }
  } catch (e) {
    console.error('[MP] Error recording match results:', e);
  }
}

export async function leaveGame(roomId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    const players = room.players.filter((p) => p.uid !== uid);
    if (players.length === 0) {
      transaction.delete(ref);
    } else {
      transaction.update(ref, { players });
    }
  });
}

export async function sendChatMessage(roomId: string, message: Omit<GameChatMessage, 'timestamp'>): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const newMessage = { ...message, timestamp: ts(), id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    transaction.update(ref, { liveChat: [...room.liveChat.slice(-99), newMessage] });
  });
}

export async function addSpectator(roomId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    if (!room.spectators.includes(uid)) {
      transaction.update(ref, { spectators: [...room.spectators, uid] });
    }
  });
}

export async function removeSpectator(roomId: string, uid: string): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    transaction.update(ref, { spectators: room.spectators.filter((s) => s !== uid) });
  });
}

export async function sendReaction(roomId: string, reaction: { uid: string; name: string; emoji: string }): Promise<void> {
  const ref = doc(db, 'gameRooms', roomId);
  const newReaction = {
    id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...reaction,
    timestamp: ts(),
  };
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    const reactions = [...(room.reactions || []), newReaction].slice(-50);
    const chatMessage = {
      uid: reaction.uid,
      name: reaction.name,
      text: reaction.emoji,
      timestamp: ts(),
      type: 'reaction' as const,
      id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    transaction.update(ref, {
      reactions,
      liveChat: [...room.liveChat.slice(-99), chatMessage],
    });
  });
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
  const q = query(
    collection(db, 'gameRooms'),
    where('status', 'in', ['waiting', 'in_progress']),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const rooms: GameRoom[] = [];

    for (const d of snapshot.docs) {
      const data = { id: d.id, ...d.data() } as GameRoom;
      if (data.expiresAt && data.expiresAt < now && data.players.length < 2) {
        deleteDoc(doc(db, 'gameRooms', d.id)).catch(() => {});
      } else {
        rooms.push(data);
      }
    }
    cb(rooms);
  }, (err) => {
    console.error('[MP] subscribeToActiveGames error:', err);
    cb([]);
  });
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
  const ref = doc(db, 'playerStats', uid);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const stats = snap.exists() ? snap.data() as PlayerStats : getDefaultPlayerStats(uid);
    const newMatchesPlayed = stats.matchesPlayed + 1;
    const newWins = stats.wins + (result.result === 'win' ? 1 : 0);
    const newStats: PlayerStats = {
      ...stats,
      matchesPlayed: newMatchesPlayed,
      wins: newWins,
      losses: stats.losses + (result.result === 'loss' ? 1 : 0),
      draws: stats.draws + (result.result === 'draw' ? 1 : 0),
      totalXPEarned: stats.totalXPEarned + result.xpEarned,
      winRate: newMatchesPlayed > 0 ? Math.round((newWins / newMatchesPlayed) * 100) : 0,
      matchHistory: [result, ...stats.matchHistory.slice(0, 49)],
    };
    transaction.set(ref, sanitize(newStats));
  });

  try {
    await addXP(uid, 'multiplayerWin', result.xpEarned, { result: result.result, mode: result.mode });
  } catch (e) {
    console.error('[MP] Failed to add XP:', e);
  }
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
  const config = GAME_MODE_CONFIG[params.mode];
  if (!config) throw new Error('Invalid game mode');

  const ref = doc(collection(db, 'gameRooms'));

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
    expiresAt: Date.now() + ROOM_TIMEOUT_MS,
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

  let playerIdx = 0;
  while (matchesInRound >= 1) {
    const round: TournamentRound = { matches: [] };
    for (let i = 0; i < matchesInRound; i++) {
      const p1 = shuffled[playerIdx++] || null;
      const p2 = shuffled[playerIdx++] || null;
      round.matches.push({
        id: `match-${rounds.length}-${i}`,
        player1: p1?.uid || '',
        player2: p2?.uid || '',
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
