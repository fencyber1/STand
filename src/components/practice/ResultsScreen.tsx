import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, Home, RotateCcw, RotateCw, Download, CreditCard, Clock, Zap, Share2, Lightbulb } from 'lucide-react';
import { storage } from '../../services/storage';
import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS } from '../../constants/achievements';
import { getTopicFunFact } from '../../services/api';
import { createNotification } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import type { QuestionTiming, AchievementStats } from '../../types';

interface ResultsState {
  topic: string;
  sector: string;
  level: string;
  questions: Array<{
    id: string;
    question: string;
    type: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    difficulty: string;
    subject: string;
    topic: string;
    imageQuery?: string;
  }>;
  results: Array<{
    questionId: string;
    userAnswer: string | string[];
    correct: boolean | null;
    explanation: string;
    score?: number;
  }>;
  correctCount: number;
  totalCount: number;
  totalScore: number;
  questionTimings?: QuestionTiming[];
}

export default function ResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultsState | null;
  const { user } = useAuth();
  const [funFact, setFunFact] = useState('');
  const [funFactLoading, setFunFactLoading] = useState(true);

  useEffect(() => {
    if (state?.topic && state?.sector) {
      setFunFactLoading(true);
      getTopicFunFact(state.topic, state.sector)
        .then(setFunFact)
        .catch(() => setFunFact(''))
        .finally(() => setFunFactLoading(false));
    }
  }, [state?.topic, state?.sector]);

  useEffect(() => {
    if (state) {
      const totalScore = state.totalScore || 0;
      const percentage = Math.round((totalScore / (state.totalCount * 100)) * 100);
      const effectiveCorrect = state.results.filter((r) => r.score != null ? r.score >= 50 : r.correct === true).length;
      storage.saveSession({
        id: Date.now().toString(),
        topic: state.topic,
        sector: state.sector,
        level: state.level,
        questionType: 'Mixed',
        date: new Date().toISOString(),
        score: percentage,
        totalQuestions: state.totalCount,
        correctAnswers: effectiveCorrect,
      });

      const history = storage.getHistory();
      const totalSessions = history.length;
      const totalQuestions = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
      const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
      const subjects = new Set(history.map((h) => h.sector)).size;
      const perfectScores = history.filter((h) => h.score === 100).length;

      let streak = 0;
      const dates = [...new Set(history.map((h) => new Date(h.date).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const today = new Date().toDateString();
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date();
        expected.setDate(expected.getDate() - i);
        if (dates[i] === expected.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      const allTimings = storage.getQuestionTimings();
      const fastestAnswer = allTimings.length > 0 ? Math.min(...allTimings.map((t) => t.timeSpent)) : null;

      const stats: AchievementStats = {
        totalSessions,
        totalQuestions,
        totalCorrect,
        streak,
        perfectScores,
        subjects,
        timeSpent: totalSessions * 300,
        fastestAnswer,
      };

      for (const ach of ACHIEVEMENTS) {
        if (ach.condition(stats)) {
          const isNew = storage.unlockAchievement(ach.id);
          if (isNew && user?.uid) {
            createNotification(user.uid, {
              type: 'achievement',
              title: 'Achievement Unlocked!',
              body: `${ach.icon} ${ach.name} — ${ach.description}`,
              link: '/achievements',
              fromUid: '',
              fromName: '',
              fromPhoto: '',
            }).catch(() => {});
          }
        }
      }
    }
  }, []);

  const timingStats = useMemo(() => {
    if (!state?.questionTimings?.length) return null;
    const timings = state.questionTimings;
    const sorted = [...timings].sort((a, b) => a.timeSpent - b.timeSpent);
    const fastest = sorted[0];
    const slowest = sorted[sorted.length - 1];
    const avg = timings.reduce((s, t) => s + t.timeSpent, 0) / timings.length;
    return { fastest, slowest, avg };
  }, [state?.questionTimings]);

  if (!state) {
    navigate('/practice');
    return null;
  }

  const { topic, results, totalCount } = state;
  const totalScore = state.totalScore || 0;
  const percentage = Math.round((totalScore / (totalCount * 100)) * 100);
  const effectiveCorrectCount = results.filter((r) => r.score != null ? r.score >= 50 : r.correct === true).length;
  const avgTheoryScore = results
    .filter((r) => r.score != null)
    .reduce((s, r, _, arr) => s + (r.score || 0) / (arr.length || 1), 0);

  const wrongResults = results.filter((r) => r.correct === false);
  const wrongQuestions = state.questions?.filter((q) => wrongResults.some((r) => r.questionId === q.id)) || [];

  const handleReviewWrong = () => {
    if (wrongQuestions.length === 0) return;
    navigate('/quiz', {
      state: {
        questions: wrongQuestions,
        topic: `${topic} (Review)`,
        sector: state.sector,
        level: state.level,
        questionType: 'Review',
        timeLimit: 0,
      },
    });
  };

  const handleExportPDF = () => {
    const printContent = `
      <html><head><title>STand Results - ${topic}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; flex: 1; }
        .stat .value { font-size: 28px; font-weight: bold; }
        .stat .label { font-size: 12px; color: #666; margin-top: 4px; }
        .correct { color: #16a34a; }
        .wrong { color: #dc2626; }
        .question { margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #ddd; }
        .question.correct-q { border-left-color: #16a34a; }
        .question.wrong-q { border-left-color: #dc2626; }
        .q-title { font-weight: 600; margin-bottom: 4px; }
        .q-detail { font-size: 13px; color: #555; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
      </style></head><body>
      <h1>STand Exam Results</h1>
      <p><strong>Topic:</strong> ${topic} | <strong>Subject:</strong> ${state.sector} | <strong>Level:</strong> ${state.level}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <div class="stats">
        <div class="stat"><div class="value">${percentage}%</div><div class="label">Score</div></div>
        <div class="stat"><div class="value">${effectiveCorrectCount}/${totalCount}</div><div class="label">Correct</div></div>
        <div class="stat"><div class="value">${totalCount - effectiveCorrectCount}</div><div class="label">Wrong</div></div>
      </div>
      <h2>Question Details</h2>
      ${results.map((r, i) => {
        const q = state.questions?.find((qq) => qq.id === r.questionId);
        return `<div class="question ${r.correct ? 'correct-q' : 'wrong-q'}">
          <div class="q-title">${r.correct ? '✓' : '✗'} Question ${i + 1}</div>
          <div class="q-detail">${q?.question || ''}</div>
          <div class="q-detail">Your answer: ${Array.isArray(r.userAnswer) ? r.userAnswer.join(', ') : r.userAnswer || '(none)'}</div>
          ${!r.correct ? `<div class="q-detail">Correct: ${(Array.isArray(q?.correctAnswer) ? q?.correctAnswer[0] : q?.correctAnswer || '').replace(/^[A-Za-z][.\s]+/, '').trim()}</div>` : ''}
          <div class="q-detail" style="margin-top:4px;color:#666;">${r.explanation}</div>
        </div>`;
      }).join('')}
      <div class="footer">Generated by STand Exam Practice</div>
      </body></html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportAnki = () => {
    const lines = state.questions.map((q) => {
      const front = q.question.replace(/"/g, '""');
      let back = '';
      if (q.type === 'MCQ' && q.options) {
        back = q.options.join('<br>');
        back += `<br><br><strong>Answer:</strong> ${(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).replace(/^[A-Za-z][.\s]+/, '').trim()}`;
      } else {
        back = `<strong>Answer:</strong> ${(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer).replace(/^[A-Za-z][.\s]+/, '').trim()}`;
      }
      back += `<br><br><em>${q.explanation.replace(/"/g, '""')}</em>`;
      return `"${front}","${back.replace(/"/g, '""')}","${q.subject}","${q.topic}"`;
    });

    const csv = 'Front,Back,Subject,Topic\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stand-flashcards-${topic.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 800, 420);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 420);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STand Exam Practice', 400, 50);

    ctx.fillStyle = '#c7d2fe';
    ctx.font = '16px Arial';
    ctx.fillText(topic, 400, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.fillText(`${percentage}%`, 400, 175);

    ctx.fillStyle = '#a5b4fc';
    ctx.font = '20px Arial';
    ctx.fillText(`${effectiveCorrectCount} / ${totalCount} correct`, 400, 215);

    const barY = 245;
    const barW = 500;
    const barH = 16;
    const barX = (800 - barW) / 2;
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    const fillColor = percentage >= 70 ? '#22c55e' : percentage >= 50 ? '#f97316' : '#ef4444';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * (percentage / 100), barH, 8);
    ctx.fill();

    const stats = [
      { label: 'Score', value: `${percentage}%` },
      { label: 'Subject', value: state.sector },
      { label: 'Level', value: state.level },
      { label: 'Date', value: new Date().toLocaleDateString() },
    ];
    ctx.font = '14px Arial';
    stats.forEach((s, i) => {
      const sx = 100 + i * 180;
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, sx, 295);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(s.value, sx, 318);
      ctx.font = '14px Arial';
    });

    ctx.fillStyle = '#6366f1';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by STand • stand-app.com', 400, 400);

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (typeof navigator.share === 'function') {
        const file = new File([blob], 'stand-results.png', { type: 'image/png' });
        navigator.share({ files: [file], title: 'My STand Results' }).catch(() => {
          downloadCanvas(canvas);
        });
      } else {
        downloadCanvas(canvas);
      }
    });
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `stand-results-${topic.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const formatSeconds = (s: number) => {
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  const fastestQuestion = timingStats?.fastest ? state.questions?.find((q) => q.id === timingStats.fastest.questionId) : null;
  const slowestQuestion = timingStats?.slowest ? state.questions?.find((q) => q.id === timingStats.slowest.questionId) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex p-4 bg-primary-50 dark:bg-primary-900/30 rounded-full mb-3">
          <Trophy size={32} className="text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Results</h1>
        <p className="text-gray-500 dark:text-gray-400">{topic}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
          <p className={`text-3xl font-bold ${percentage >= 70 ? 'text-green-600 dark:text-green-400' : percentage >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
            {percentage}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Score</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {effectiveCorrectCount}/{totalCount}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Correct</p>
        </div>
        {avgTheoryScore > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{Math.round(avgTheoryScore)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg Theory</p>
          </div>
        )}
      </div>

      {funFact && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-5 border border-yellow-200 dark:border-yellow-800 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg shrink-0">
              <Lightbulb size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300 mb-1">Fun Fact about {topic}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{funFact}</p>
            </div>
          </div>
        </div>
      )}
      {funFactLoading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading a fun fact about {topic}...</p>
        </div>
      )}

      {timingStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Time Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatSeconds(timingStats.avg)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg / Question</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatSeconds(timingStats.fastest.timeSpent)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fastest</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatSeconds(timingStats.slowest.timeSpent)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Slowest</p>
            </div>
          </div>
          {fastestQuestion && (
            <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2">
              <Zap size={14} className="text-green-500 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-300">
                <strong>Fastest:</strong> {fastestQuestion.question.slice(0, 80)}...
              </p>
            </div>
          )}
          {slowestQuestion && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Clock size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">
                <strong>Slowest:</strong> {slowestQuestion.question.slice(0, 80)}...
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Performance Summary</h3>
        <p className={`text-sm ${
          percentage >= 80 ? 'text-green-600 dark:text-green-400' : percentage >= 60 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {percentage >= 80
            ? 'Excellent work! You have a strong understanding of this topic.'
            : percentage >= 60
            ? 'Good effort! Consider reviewing some areas for improvement.'
            : 'Keep practicing! Review the material and try again.'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Question Details</h3>
        <div className="space-y-4">
          {results.map((r, i) => {
            const timing = timingStats ? state.questionTimings?.find((t) => t.questionId === r.questionId) : null;
            return (
              <div key={r.questionId} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  {r.correct === true ? (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                  ) : r.correct === false ? (
                    <XCircle size={16} className="text-red-600 dark:text-red-400" />
                  ) : (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                      Score: {r.score}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Question {i + 1}</span>
                  {timing && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{formatSeconds(timing.timeSpent)}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{r.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          to="/practice"
          className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
        >
          <Home size={18} />
          New Topic
        </Link>
        {wrongQuestions.length > 0 && (
          <button
            onClick={handleReviewWrong}
            className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <RotateCw size={18} />
            Review Wrong ({wrongQuestions.length})
          </button>
        )}
        <button
          onClick={handleExportPDF}
          className="flex-1 py-3 bg-gray-700 dark:bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-500 transition flex items-center justify-center gap-2"
        >
          <Download size={18} />
          PDF
        </button>
        <button
          onClick={handleExportAnki}
          className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          Anki
        </button>
        <button
          onClick={handleShareCard}
          className="flex-1 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          Share
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          Try Again
        </button>
      </div>
    </div>
  );
}
