import type { Tournament, TournamentPlayer, TournamentMatch, TournamentGroup, TournamentFormat, TournamentConfig, KnockoutRound, MatchStatus } from '../types/tournament';

const STORAGE_KEY = 'stand_tournaments';

function readStorage(): Tournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeStorage(tournaments: Tournament[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    return true;
  } catch (e) {
    console.error('[TournamentService] writeStorage failed:', e);
    return false;
  }
}

export function clearAllTournaments(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAllTournaments(): Tournament[] {
  return readStorage();
}

export function getTournament(id: string): Tournament | undefined {
  return readStorage().find((t) => t.id === id);
}

export function createTournament(params: {
  name: string;
  description: string;
  format: TournamentFormat;
  config: TournamentConfig;
  prizes: Tournament['prizes'];
  registrationDeadline: number;
  startDate: number;
  createdBy: string;
  createdByName: string;
}): Tournament | null {
  let tournaments = readStorage();
  const tournament: Tournament = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: params.name,
    description: params.description,
    format: params.format,
    status: 'registration',
    participants: [{
      uid: params.createdBy,
      name: params.createdByName,
      rank: 0,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      xpEarned: 0,
      eliminated: false,
    }],
    groups: [],
    knockoutMatches: [],
    config: params.config,
    prizes: params.prizes,
    registrationDeadline: params.registrationDeadline,
    startDate: params.startDate,
    createdAt: Date.now(),
    createdBy: params.createdBy,
    currentMatchday: 1,
  };
  tournaments.push(tournament);
  if (!writeStorage(tournaments)) {
    // Storage full - clear and retry with just this tournament
    localStorage.removeItem(STORAGE_KEY);
    const success = writeStorage([tournament]);
    if (!success) {
      return null; // Still can't save
    }
  }
  return tournament;
}

export function joinTournament(tournamentId: string, player: { uid: string; name: string; photo?: string }): boolean {
  const tournaments = readStorage();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return false;
  if (tournament.participants.find((p) => p.uid === player.uid)) return true;
  tournament.participants.push({
    uid: player.uid,
    name: player.name,
    photo: player.photo,
    rank: 0,
    score: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    xpEarned: 0,
    eliminated: false,
  });
  return writeStorage(tournaments);
}

export function generateGroups(tournament: Tournament): TournamentGroup[] {
  const players = [...tournament.participants];
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  const groupSize = tournament.config.groupSize || 4;
  const groups: TournamentGroup[] = [];
  const groupNames = 'ABCDEFGHIJKLMNOP'.split('');
  for (let i = 0; i < players.length; i += groupSize) {
    const groupPlayers = players.slice(i, i + groupSize).map((p, idx) => ({ ...p, group: groupNames[groups.length] }));
    groups.push({
      name: groupNames[groups.length],
      players: groupPlayers,
      matches: generateGroupMatches(groupPlayers, tournament.config),
    });
  }
  return groups;
}

function generateGroupMatches(players: TournamentPlayer[], config: TournamentConfig): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let matchNum = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matchNum++;
      matches.push({
        id: `g-${players[i].uid}-${players[j].uid}-${Date.now()}`,
        round: 'group',
        matchNumber: matchNum,
        player1: players[i],
        player2: players[j],
        score1: 0,
        score2: 0,
        status: 'scheduled',
        scheduledAt: Date.now() + matchNum * 86400000,
        questionsCount: config.questionsCount,
        timePerQuestion: config.timePerQuestion,
      });
    }
  }
  return matches;
}

export function generateKnockoutBracket(qualifiedPlayers: TournamentPlayer[], format: TournamentFormat): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const rounds: KnockoutRound[] = getRoundsForFormat(format, qualifiedPlayers.length);
  let prevRoundMatches: TournamentMatch[] = [];
  rounds.forEach((round, roundIdx) => {
    const matchCount = round === 'final' ? 1 : round === 'semi_final' ? 2 : round === 'quarter_final' ? 4 : round === 'round_of_16' ? 8 : 16;
    const roundMatches: TournamentMatch[] = [];
    for (let i = 0; i < matchCount; i++) {
      const match: TournamentMatch = {
        id: `${round}-${i}-${Date.now()}`,
        round,
        matchNumber: i,
        player1: roundIdx === 0 ? qualifiedPlayers[i * 2] || null : null,
        player2: roundIdx === 0 ? qualifiedPlayers[i * 2 + 1] || null : null,
        score1: 0,
        score2: 0,
        status: 'scheduled',
        scheduledAt: Date.now() + (roundIdx + 1) * 86400000,
        questionsCount: 20 + roundIdx * 5,
        timePerQuestion: 30 - roundIdx * 5,
      };
      roundMatches.push(match);
    }
    if (prevRoundMatches.length > 0) {
      roundMatches.forEach((m, i) => {
        const prevMatch1 = prevRoundMatches[i * 2];
        const prevMatch2 = prevRoundMatches[i * 2 + 1];
        const winner1 = prevMatch1?.winner;
        const winner2 = prevMatch2?.winner;
        m.player1 = winner1 ? (prevMatch1?.player1?.uid === winner1 ? prevMatch1.player1 : prevMatch1?.player2 || null) : null;
        m.player2 = winner2 ? (prevMatch2?.player1?.uid === winner2 ? prevMatch2.player1 : prevMatch2?.player2 || null) : null;
      });
    }
    matches.push(...roundMatches);
    prevRoundMatches = roundMatches;
  });
  return matches;
}

function getRoundsForFormat(format: TournamentFormat, playerCount: number): KnockoutRound[] {
  if (format === 'single') {
    if (playerCount <= 4) return ['semi_final', 'final'];
    if (playerCount <= 8) return ['quarter_final', 'semi_final', 'final'];
    if (playerCount <= 16) return ['round_of_16', 'quarter_final', 'semi_final', 'final'];
    return ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];
  }
  if (format === 'double') return ['round_of_16', 'quarter_final', 'semi_final', 'final'];
  return ['quarter_final', 'semi_final', 'final'];
}

export function updateMatchResult(tournamentId: string, matchId: string, score1: number, score2: number): boolean {
  const tournaments = readStorage();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return false;
  const allMatches = [...tournament.groups.flatMap((g) => g.matches), ...tournament.knockoutMatches];
  const match = allMatches.find((m) => m.id === matchId);
  if (!match) return false;
  match.score1 = score1;
  match.score2 = score2;
  match.status = 'completed';
  match.completedAt = Date.now();
  match.winner = score1 >= score2 ? match.player1?.uid : match.player2?.uid;
  return writeStorage(tournaments);
}

export function startTournament(tournamentId: string): Tournament | undefined {
  const tournaments = readStorage();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return undefined;
  tournament.groups = generateGroups(tournament);
  tournament.status = 'group_stage';
  if (!writeStorage(tournaments)) return undefined;
  return tournament;
}

export function advanceToKnockout(tournamentId: string): Tournament | undefined {
  const tournaments = readStorage();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return undefined;
  const qualified: TournamentPlayer[] = [];
  tournament.groups.forEach((g) => {
    const sorted = [...g.players].sort((a, b) => b.points - a.points || b.score - a.score);
    sorted.slice(0, tournament.config.qualifyPerGroup || 2).forEach((p) => qualified.push(p));
  });
  tournament.knockoutMatches = generateKnockoutBracket(qualified, tournament.format);
  tournament.status = 'knockout';
  if (!writeStorage(tournaments)) return undefined;
  return tournament;
}

export function finishTournament(tournamentId: string): boolean {
  const tournaments = readStorage();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return false;
  tournament.status = 'finished';
  return writeStorage(tournaments);
}

export function deleteTournament(tournamentId: string): void {
  const tournaments = readStorage().filter((t) => t.id !== tournamentId);
  writeStorage(tournaments);
}

export function getTournamentProfile(uid: string): {
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  xpEarned: number;
  bestFinish: number;
} {
  const tournaments = readStorage();
  let tournamentsPlayed = 0;
  let tournamentsWon = 0;
  let matchesPlayed = 0;
  let matchesWon = 0;
  let xpEarned = 0;
  let bestFinish = Infinity;
  tournaments.forEach((t) => {
    const player = t.participants.find((p) => p.uid === uid);
    if (!player) return;
    tournamentsPlayed++;
    xpEarned += player.xpEarned;
    if (player.rank === 1) tournamentsWon++;
    if (player.rank > 0 && player.rank < bestFinish) bestFinish = player.rank;
    matchesPlayed += player.wins + player.losses + player.draws;
    matchesWon += player.wins;
  });
  return {
    tournamentsPlayed,
    tournamentsWon,
    matchesPlayed,
    matchesWon,
    winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
    xpEarned,
    bestFinish: bestFinish === Infinity ? 0 : bestFinish,
  };
}
