import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import type { Question, QuestionTiming } from '../../types';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';

interface ExamState {
  questions: Question[];
  topic: string;
  sector: string;
  level: string;
  timeLimit: number;
}

interface Answer {
  questionId: string;
  answer: string | null;
}

export default function ExamSimScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ExamState | null;

  if (!state?.questions?.length) {
    navigate('/practice');
    return null;
  }

  const { questions, topic, sector, level, timeLimit } = state;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(
    questions.map((q) => ({ questionId: q.id, answer: null }))
  );
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const questionTimingsRef = useRef<QuestionTiming[]>([]);

  const current = questions[currentIndex];
  const currentAnswer = answers[currentIndex]?.answer;
  const answeredCount = answers.filter((a) => a.answer !== null).length;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  const recordTiming = useCallback(() => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const qId = questions[currentIndex]?.id;
    if (!qId) return;
    const existing = questionTimingsRef.current.findIndex((t) => t.questionId === qId);
    if (existing >= 0) {
      questionTimingsRef.current[existing].timeSpent = elapsed;
    } else {
      questionTimingsRef.current.push({ questionId: qId, timeSpent: elapsed });
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      handleSubmitExam();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], answer: option };
      return next;
    });
  };

  const handleTextChange = (text: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], answer: text || null };
      return next;
    });
  };

  const handleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(current.question);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleSubmitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    recordTiming();

    const results = questions.map((q, i) => {
      const userAnswer = answers[i]?.answer || '';
      let correct = false;

      if (q.type === 'MCQ' || q.type === 'TrueFalse') {
        const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
        const correctStr = stripPrefix(String(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer));
        correct = stripPrefix(userAnswer) === correctStr;
      } else if (q.type === 'Theory') {
        const normalize = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
        const userNorm = normalize(userAnswer);
        const correctNorm = normalize(String(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer));
        if (userNorm === correctNorm) {
          correct = true;
        } else if (userNorm.includes(correctNorm) || correctNorm.includes(userNorm)) {
          correct = Math.min(userNorm.length, correctNorm.length) / Math.max(userNorm.length, correctNorm.length) >= 0.8;
        } else {
          const userWords = new Set(userNorm.split(/\s+/));
          const correctWords = new Set(correctNorm.split(/\s+/));
          let overlap = 0;
          correctWords.forEach((w) => { if (userWords.has(w)) overlap++; });
          correct = correctWords.size > 0 ? overlap / correctWords.size >= 0.8 : false;
        }
      } else {
        correct = userAnswer.trim().toLowerCase() === String(q.correctAnswer).toLowerCase();
      }

      return {
        questionId: q.id,
        userAnswer,
        correct,
        explanation: q.explanation,
        score: q.type === 'Theory' ? (() => {
          const normalize = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
          const userNorm = normalize(userAnswer);
          const correctNorm = normalize(String(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer));
          if (userNorm === correctNorm) return 100;
          if (userNorm.includes(correctNorm) || correctNorm.includes(userNorm)) {
            return Math.round(60 + (Math.min(userNorm.length, correctNorm.length) / Math.max(userNorm.length, correctNorm.length)) * 40);
          }
          const userWords = new Set(userNorm.split(/\s+/));
          const correctWords = new Set(correctNorm.split(/\s+/));
          let overlap = 0;
          correctWords.forEach((w) => { if (userWords.has(w)) overlap++; });
          return Math.round(Math.min(100, Math.max(20, (correctWords.size > 0 ? overlap / correctWords.size : 0) * 100)));
        })() : undefined,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const totalScore = results.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);

    storage.saveQuestionTimings(questionTimingsRef.current);

    navigate('/results', {
      state: { topic, sector, level, questions, results, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
    });
  }, [questions, answers, topic, sector, level, navigate, recordTiming]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      recordTiming();
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      recordTiming();
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setCurrentIndex((i) => i - 1);
    }
  };

  const isWarning = timeLeft <= 60;
  const isCritical = timeLeft <= 30;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Exam Mode</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{topic}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {answeredCount}/{questions.length} answered
            </span>
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1.5 rounded-lg ${
              isCritical ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse' :
              isWarning ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <Timer size={16} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all ${isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-primary-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-medium rounded ${
              current.type === 'MCQ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
              current.type === 'Theory' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' :
              current.type === 'TrueFalse' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
              'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
            }`}>
              {current.type}
            </span>
            <span className={`px-2.5 py-1 text-xs font-medium rounded ${
              current.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
              current.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
              'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            }`}>
              {current.difficulty}
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <BorderGlow
          backgroundColor="#1f2937"
          borderRadius={12}
          glowColor="220 80 70"
          glowRadius={30}
          glowIntensity={0.7}
          edgeSensitivity={35}
          colors={['#6366f1', '#8b5cf6', '#3b82f6']}
        >
          <div className="p-6 dark:bg-gray-800">
            <div className="flex items-start gap-2 mb-4">
              <p className="text-gray-800 dark:text-gray-100 text-lg leading-relaxed flex-1">{current.question}</p>
              <button
                onClick={handleSpeak}
                className="shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title={speaking ? 'Stop reading' : 'Read question aloud'}
              >
                {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>

            {current.imageQuery && (
              <div className="mb-5 flex justify-center">
                <img
                  src={`https://loremflickr.com/480/300/${encodeURIComponent(current.imageQuery)}`}
                  alt={current.imageQuery}
                  className="rounded-xl object-cover max-h-52 border border-gray-200 dark:border-gray-600 shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {current.type === 'MCQ' && current.options && (
              <div className="space-y-3 mb-6">
                {current.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      currentAnswer === opt
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                  </button>
                ))}
              </div>
            )}

            {current.type === 'TrueFalse' && (
              <div className="flex gap-4 mb-6">
                {['True', 'False'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition ${
                      currentAnswer === opt
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {(current.type === 'Theory' || current.type === 'FillBlank') && (
              <div className="mb-6">
                <textarea
                  value={currentAnswer || ''}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-32"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </BorderGlow>

        <div className="mt-6 grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questions.map((q, i) => {
            const ans = answers[i]?.answer;
            return (
              <button
                key={q.id}
                onClick={() => { recordTiming(); setCurrentIndex(i); }}
                className={`w-full aspect-square rounded-lg text-xs font-bold transition ${
                  i === currentIndex
                    ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900'
                    : ''
                } ${
                  ans !== null
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-full">
                <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Submit Exam?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="text-orange-600 dark:text-orange-400"> {questions.length - answeredCount} unanswered question(s) will be marked wrong.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Continue Exam
              </button>
              <button
                onClick={handleSubmitExam}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
