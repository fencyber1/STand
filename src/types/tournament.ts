export type TournamentFormat = 'worldcup' | 'champions' | 'single' | 'league' | 'survival' | 'double';
export type TournamentStatus = 'upcoming' | 'registration' | 'group_stage' | 'knockout' | 'finished';
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type KnockoutRound = 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';

export interface TournamentPlayer {
  uid: string;
  name: string;
  photo?: string;
  rank: number;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  xpEarned: number;
  eliminated: boolean;
  group?: string;
}

export interface TournamentMatch {
  id: string;
  round: KnockoutRound | 'group';
  matchNumber: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  score1: number;
  score2: number;
  status: MatchStatus;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  winner?: string;
  questionsCount: number;
  timePerQuestion: number;
}

export interface TournamentGroup {
  name: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
}

export interface TournamentConfig {
  questionsCount: number;
  timePerQuestion: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  subject: string;
  topic: string;
  groupSize: number;
  qualifyPerGroup: number;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  banner?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  participants: TournamentPlayer[];
  groups: TournamentGroup[];
  knockoutMatches: TournamentMatch[];
  config: TournamentConfig;
  prizes: {
    xpPool: number;
    winnerXP: number;
    finalistXP: number;
    semiFinalistXP: number;
  };
  registrationDeadline: number;
  startDate: number;
  endDate?: number;
  createdAt: number;
  createdBy: string;
  currentMatchday: number;
}

export interface TournamentProfile {
  uid: string;
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  averageScore: number;
  xpEarned: number;
  bestFinish: number;
  currentStreak: number;
  badges: TournamentBadge[];
}

export interface TournamentBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: number;
}

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  worldcup: 'World Cup Style',
  champions: 'Champions League',
  single: 'Single Elimination',
  league: 'League',
  survival: 'Survival',
  double: 'Double Elimination',
};

export const KNOCKOUT_ROUND_LABELS: Record<KnockoutRound, string> = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final: 'Semi-Final',
  final: 'Grand Final',
};
