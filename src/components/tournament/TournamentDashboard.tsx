import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Swords, Users, Clock, Star, Target, Zap, Shield, Flame, Award, ChevronRight, Play, CheckCircle, XCircle, Eye, Calendar, BarChart3, Medal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SECTORS } from '../../constants';
import { getAllTournaments, createTournament, joinTournament, getTournament, startTournament, updateMatchResult, advanceToKnockout, finishTournament, deleteTournament, getTournamentProfile } from '../../services/tournamentService';
import type { Tournament, TournamentPlayer, TournamentMatch, TournamentGroup, TournamentFormat, TournamentConfig } from '../../types/tournament';
import { TOURNAMENT_FORMAT_LABELS, KNOCKOUT_ROUND_LABELS } from '../../types/tournament';

const NEON_CYAN = '#06b6d4';
const NEON_PURPLE = '#a855f7';
const NEON_BLUE = '#3b82f6';
const NEON_GREEN = '#22c55e';

export default function TournamentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadTournaments = useCallback(() => {
    setTournaments(getAllTournaments());
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  const handleJoin = (tid: string) => {
    if (!user) return;
    joinTournament(tid, { uid: user.uid, name: user.fullName || 'Player', photo: user.photoURL || undefined });
    loadTournaments();
  };

  const handleSelect = (t: Tournament) => {
    setSelectedTournament(getTournament(t.id) || t);
    setTab('overview');
  };

  return (
    <div className="min-h-screen relative" style={{ background: '#070b14' }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.06),transparent_50%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})` }}>
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Tournaments</h1>
              <p className="text-xs text-gray-500">Compete. Conquer. Champion.</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105" style={{ background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_BLUE})`, boxShadow: `0 0 20px rgba(6,182,212,0.3)` }}>
            + Create Tournament
          </button>
        </div>

        {showCreate && <TournamentCreate onClose={() => setShowCreate(false)} onCreated={(t) => { setShowCreate(false); loadTournaments(); setSelectedTournament(t); }} />}

        {selectedTournament ? (
          <TournamentDetail tournament={selectedTournament} onBack={() => { setSelectedTournament(null); loadTournaments(); }} onUpdate={() => setSelectedTournament(getTournament(selectedTournament.id) || null)} />
        ) : (
          <div className="space-y-4">
            {tournaments.length === 0 ? (
              <div className="text-center py-20">
                <Crown size={48} className="mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 text-lg font-semibold">No tournaments yet</p>
                <p className="text-gray-600 text-sm mt-1">Create one to start the competition!</p>
              </div>
            ) : (
              tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} onSelect={() => handleSelect(t)} onJoin={() => handleJoin(t.id)} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ tournament, onSelect, onJoin }: { tournament: Tournament; onSelect: () => void; onJoin: () => void }) {
  const statusColors: Record<string, string> = { upcoming: 'text-gray-400 bg-gray-400/10', registration: 'text-cyan-400 bg-cyan-400/10', group_stage: 'text-blue-400 bg-blue-400/10', knockout: 'text-purple-400 bg-purple-400/10', finished: 'text-green-400 bg-green-400/10' };
  return (
    <div onClick={onSelect} className="group cursor-pointer rounded-2xl border border-white/5 p-5 transition-all hover:border-cyan-500/30 hover:bg-white/[0.02]" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(6,182,212,0.3)' }}>
            <Trophy size={24} style={{ color: NEON_CYAN }} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{tournament.name}</h3>
            <p className="text-gray-500 text-sm">{tournament.description}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColors[tournament.status] || 'text-gray-400 bg-gray-400/10'}`}>{tournament.status.replace('_', ' ')}</span>
              <span className="text-xs text-gray-500">{tournament.participants.length} players</span>
              <span className="text-xs text-gray-500">{TOURNAMENT_FORMAT_LABELS[tournament.format]}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Prize</p>
            <p className="text-sm font-bold" style={{ color: NEON_CYAN }}>{tournament.prizes.xpPool.toLocaleString()} XP</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onJoin(); }} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105" style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)' }}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentDetail({ tournament, onBack, onUpdate }: { tournament: Tournament; onBack: () => void; onUpdate: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'standings', label: 'Standings', icon: BarChart3 },
    { id: 'knockout', label: 'Knockout', icon: Crown },
    { id: 'results', label: 'Results', icon: Trophy },
  ];

  return (
    <div>
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition">← Back to Tournaments</button>
      <div className="rounded-2xl border border-white/5 p-6 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.5))' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1), transparent)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">{tournament.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{tournament.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs font-bold uppercase px-3 py-1 rounded-full text-cyan-400 bg-cyan-400/10">{tournament.status.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-500">{tournament.participants.length} Players</span>
              <span className="text-xs text-gray-500">{tournament.prizes.xpPool.toLocaleString()} XP Pool</span>
            </div>
          </div>
          <TournamentActions tournament={tournament} onUpdate={onUpdate} />
        </div>
      </div>
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${tab === tb.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} style={tab === tb.id ? { background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(6,182,212,0.3)' } : {}}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <TournamentOverview tournament={tournament} onUpdate={onUpdate} />}
      {tab === 'groups' && <TournamentGroups tournament={tournament} onUpdate={onUpdate} />}
      {tab === 'fixtures' && <TournamentFixtures tournament={tournament} />}
      {tab === 'standings' && <TournamentStandings tournament={tournament} />}
      {tab === 'knockout' && <TournamentKnockout tournament={tournament} />}
      {tab === 'results' && <TournamentResults tournament={tournament} />}
    </div>
  );
}

function TournamentActions({ tournament, onUpdate }: { tournament: Tournament; onUpdate: () => void }) {
  const { user } = useAuth();
  const isHost = tournament.createdBy === user?.uid;
  const handleStart = () => {
    if (tournament.status === 'registration') {
      startTournament(tournament.id);
      onUpdate();
    } else if (tournament.status === 'group_stage') {
      advanceToKnockout(tournament.id);
      onUpdate();
    } else if (tournament.status === 'knockout') {
      finishTournament(tournament.id);
      onUpdate();
    }
  };
  if (!isHost) return null;
  return (
    <button onClick={handleStart} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
      {tournament.status === 'registration' ? 'Start Tournament' : tournament.status === 'group_stage' ? 'Advance to Knockout' : 'Finish Tournament'}
    </button>
  );
}

function TournamentOverview({ tournament, onUpdate }: { tournament: Tournament; onUpdate: () => void }) {
  const { user } = useAuth();
  const myRank = tournament.participants.find((p) => p.uid === user?.uid)?.rank || 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Status', value: tournament.status.replace(/_/g, ' ').toUpperCase(), color: NEON_CYAN, icon: Crown },
        { label: 'Players', value: tournament.participants.length.toString(), color: NEON_BLUE, icon: Users },
        { label: 'Prize Pool', value: `${tournament.prizes.xpPool.toLocaleString()} XP`, color: NEON_PURPLE, icon: Trophy },
        { label: 'Your Rank', value: myRank > 0 ? `#${myRank}` : '—', color: NEON_GREEN, icon: Medal },
      ].map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/5 p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${s.color}15, transparent)` }} />
          <s.icon size={20} style={{ color: s.color }} className="mb-3" />
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className="text-xl font-black text-white mt-1">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function TournamentGroups({ tournament, onUpdate }: { tournament: Tournament; onUpdate: () => void }) {
  if (tournament.groups.length === 0) {
    return <div className="text-center py-12 text-gray-500"><Users size={32} className="mx-auto mb-3 text-gray-700" /><p>Groups will appear when the tournament starts</p></div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tournament.groups.map((group) => (
        <div key={group.name} className="rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
          <h3 className="text-white font-bold mb-3 flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: 'rgba(6,182,212,0.2)', color: NEON_CYAN }}>{group.name}</span> Group {group.name}</h3>
          <div className="space-y-2">
            {[...group.players].sort((a, b) => b.points - a.points || b.score - a.score).map((p, i) => {
              const qualColor = i < 2 ? NEON_GREEN : i < 3 ? '#eab308' : '#ef4444';
              return (
                <div key={p.uid} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${qualColor}20`, color: qualColor }}>{i + 1}</span>
                    <span className="text-sm text-white font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{p.wins}W {p.losses}L</span>
                    <span className="font-bold text-white">{p.points}pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TournamentFixtures({ tournament }: { tournament: Tournament }) {
  const allMatches = [...tournament.groups.flatMap((g) => g.matches), ...tournament.knockoutMatches];
  const live = allMatches.filter((m) => m.status === 'live');
  const upcoming = allMatches.filter((m) => m.status === 'scheduled');
  const completed = allMatches.filter((m) => m.status === 'completed');
  return (
    <div className="space-y-6">
      {live.length > 0 && <FixtureSection title="🔴 Live" matches={live} highlight />}
      {upcoming.length > 0 && <FixtureSection title="⏳ Upcoming" matches={upcoming} />}
      {completed.length > 0 && <FixtureSection title="✅ Completed" matches={completed} />}
      {allMatches.length === 0 && <div className="text-center py-12 text-gray-500"><Calendar size={32} className="mx-auto mb-3 text-gray-700" /><p>No fixtures yet</p></div>}
    </div>
  );
}

function FixtureSection({ title, matches, highlight }: { title: string; matches: TournamentMatch[]; highlight?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-400 mb-3">{title}</h3>
      <div className="space-y-2">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all" style={highlight ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(15,23,42,0.5))', borderColor: 'rgba(239,68,68,0.2)' } : { background: 'linear-gradient(135deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3))' }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{m.player1?.name || 'TBD'}</span>
              {m.status === 'completed' ? <span className="text-lg font-black" style={{ color: NEON_CYAN }}>{m.score1} — {m.score2}</span> : <span className="text-xs text-gray-500">VS</span>}
              <span className="text-sm font-bold text-white">{m.player2?.name || 'TBD'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{m.questionsCount}Q {m.timePerQuestion}s</span>
              {m.status === 'completed' && m.winner && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Done</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentStandings({ tournament }: { tournament: Tournament }) {
  const sorted = [...tournament.participants].sort((a, b) => b.points - a.points || b.score - a.score || b.xpEarned - a.xpEarned);
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
      <div className="grid grid-cols-8 gap-2 p-3 text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">
        <span className="col-span-1">#</span><span className="col-span-3">Player</span><span className="col-span-1 text-center">W/L</span><span className="col-span-1 text-center">Score</span><span className="col-span-2 text-right">XP</span>
      </div>
      {sorted.map((p, i) => (
        <div key={p.uid} className="grid grid-cols-8 gap-2 p-3 items-center border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
          <span className="col-span-1 text-sm font-bold" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#6b7280' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
          <span className="col-span-3 text-sm text-white font-medium truncate">{p.name}</span>
          <span className="col-span-1 text-xs text-gray-400 text-center">{p.wins}/{p.losses}</span>
          <span className="col-span-1 text-xs text-white text-center font-bold">{p.score}</span>
          <span className="col-span-2 text-xs text-right font-bold" style={{ color: NEON_CYAN }}>+{p.xpEarned}</span>
        </div>
      ))}
    </div>
  );
}

function TournamentKnockout({ tournament }: { tournament: Tournament }) {
  if (tournament.knockoutMatches.length === 0) {
    return <div className="text-center py-12 text-gray-500"><Crown size={32} className="mx-auto mb-3 text-gray-700" /><p>Knockout stage will begin after group stage</p></div>;
  }
  const rounds = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'] as const;
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.filter((r) => tournament.knockoutMatches.some((m) => m.round === r)).map((round) => {
          const matches = tournament.knockoutMatches.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[200px]">
              <h4 className="text-xs font-bold text-gray-400 uppercase text-center">{KNOCKOUT_ROUND_LABELS[round]}</h4>
              {matches.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/5 p-3 relative" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white font-medium truncate">{m.player1?.name || 'TBD'}</span>
                    {m.status === 'completed' && <span className="text-xs font-bold" style={{ color: m.winner === m.player1?.uid ? NEON_GREEN : '#ef4444' }}>{m.score1}</span>}
                  </div>
                  <div className="w-full h-px bg-white/10 my-1" />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white font-medium truncate">{m.player2?.name || 'TBD'}</span>
                    {m.status === 'completed' && <span className="text-xs font-bold" style={{ color: m.winner === m.player2?.uid ? NEON_GREEN : '#ef4444' }}>{m.score2}</span>}
                  </div>
                  {m.status === 'completed' && m.winner && <div className="mt-2 text-[10px] font-bold text-center py-1 rounded-lg bg-green-500/10 text-green-400">↑ Advances</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TournamentResults({ tournament }: { tournament: Tournament }) {
  const completed = tournament.knockoutMatches.filter((m) => m.status === 'completed');
  return (
    <div className="space-y-3">
      {completed.length === 0 ? <div className="text-center py-12 text-gray-500"><Trophy size={32} className="mx-auto mb-3 text-gray-700" /><p>No results yet</p></div> : completed.map((m) => (
        <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3))' }}>
          <span className="text-xs text-gray-500 uppercase font-bold">{m.round in KNOCKOUT_ROUND_LABELS ? KNOCKOUT_ROUND_LABELS[m.round as keyof typeof KNOCKOUT_ROUND_LABELS] : m.round}</span>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${m.winner === m.player1?.uid ? 'text-white' : 'text-gray-500'}`}>{m.player1?.name}</span>
            <span className="text-lg font-black" style={{ color: NEON_CYAN }}>{m.score1} — {m.score2}</span>
            <span className={`text-sm font-bold ${m.winner === m.player2?.uid ? 'text-white' : 'text-gray-500'}`}>{m.player2?.name}</span>
          </div>
          <span className="text-xs font-bold text-green-400">{m.winner === m.player1?.uid ? m.player1?.name : m.player2?.name} wins</span>
        </div>
      ))}
    </div>
  );
}

function TournamentCreate({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Tournament) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('worldcup');
  const [subject, setSubject] = useState('General Knowledge');
  const [topic, setTopic] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [questionsCount, setQuestionsCount] = useState(20);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [groupSize, setGroupSize] = useState(4);
  const [qualifyPerGroup, setQualifyPerGroup] = useState(2);
  const [xpPool, setXpPool] = useState(10000);
  const [created, setCreated] = useState(false);

  const handleCreate = () => {
    if (!name.trim() || !user) return;
    if (subject === 'Other' && !topic.trim()) return;
    const finalSubject = subject === 'Other' ? topic.trim() : subject;
    const finalTopic = subject === 'Other' ? topic.trim() : (topic.trim() || subject);
    const config: TournamentConfig = { questionsCount, timePerQuestion, difficulty, subject: finalSubject, topic: finalTopic, groupSize, qualifyPerGroup };
    const t = createTournament({
      name: name.trim(),
      description: description.trim() || `${TOURNAMENT_FORMAT_LABELS[format]} tournament`,
      format,
      config,
      prizes: { xpPool, winnerXP: Math.round(xpPool * 0.4), finalistXP: Math.round(xpPool * 0.25), semiFinalistXP: Math.round(xpPool * 0.15) },
      registrationDeadline: Date.now() + 7 * 86400000,
      startDate: Date.now() + 8 * 86400000,
      createdBy: user.uid,
      createdByName: user.fullName || 'Player',
    });
    setCreated(true);
    setTimeout(() => onCreated(t), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="bg-[#0f172a] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg flex items-center gap-2"><Crown size={20} style={{ color: NEON_CYAN }} /> Create Tournament</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        {created ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3"><CheckCircle size={28} className="text-green-400" /></div>
            <p className="text-white font-semibold mb-1">Tournament Created!</p>
            <p className="text-gray-400 text-sm">Opening tournament...</p>
          </div>
        ) : (
        <div className="p-6 space-y-4">
          <div><label className="block text-xs text-gray-400 mb-1">Tournament Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. STAnd Championship" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 outline-none focus:border-cyan-500" /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Description</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 outline-none focus:border-cyan-500" /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Format</label><div className="grid grid-cols-2 gap-2">{Object.entries(TOURNAMENT_FORMAT_LABELS).map(([k, v]) => <button key={k} onClick={() => setFormat(k as TournamentFormat)} className={`px-3 py-2 text-xs rounded-lg font-medium transition ${format === k ? 'text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`} style={format === k ? { background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)' } : {}}>{v}</button>)}</div></div>
          <div><label className="block text-xs text-gray-400 mb-1">Subject</label><div className="flex flex-wrap gap-1.5"><button onClick={() => { setSubject('General Knowledge'); setTopic(''); }} className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition ${subject === 'General Knowledge' ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-400'}`}>General Knowledge</button>{SECTORS.filter(s => s !== 'Other').slice(0, 8).map((s) => <button key={s} onClick={() => { setSubject(s); setTopic(''); }} className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition ${subject === s ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-400'}`}>{s}</button>)}<button onClick={() => { setSubject('Other'); setTopic(''); }} className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition ${subject === 'Other' ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-400'}`}>Other</button></div></div>
          {subject && subject !== 'General Knowledge' && <div><label className="block text-xs text-gray-400 mb-1">{subject === 'Other' ? 'Custom Subject' : 'Specific Topic (optional)'}</label><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={subject === 'Other' ? 'Type custom subject...' : `Specific ${subject} topic...`} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 outline-none focus:border-cyan-500" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Max Players</label><input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Questions</label><input type="number" value={questionsCount} onChange={(e) => setQuestionsCount(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Time/Question (s)</label><input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Difficulty</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="mixed">Mixed</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Group Size</label><input type="number" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Qualify/Group</label><input type="number" value={qualifyPerGroup} onChange={(e) => setQualifyPerGroup(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
          </div>
          <div><label className="block text-xs text-gray-400 mb-1">XP Prize Pool</label><input type="number" value={xpPool} onChange={(e) => setXpPool(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500" /></div>
          <button onClick={handleCreate} disabled={!name.trim() || (subject === 'Other' && !topic.trim())} className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}>Create Tournament</button>
        </div>
        )}
      </div>
    </div>
  );
}
