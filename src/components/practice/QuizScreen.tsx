import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Timer, ChevronDown, ChevronUp, Loader2, Bookmark, BookmarkCheck, Volume2, VolumeX, Calculator, BookOpen, Zap, Lightbulb, X, StickyNote } from 'lucide-react';
import type { Question, QuestionTiming } from '../../types';
import { getDeepExplanation, gradeTheoryAnswer, generateQuestionsProgressive } from '../../services/api';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';
import { useLanguage } from '../../contexts/LanguageContext';
import CalculatorPanel from './CalculatorPanel';
import CheatSheet from './CheatSheet';
import QuestionImage from './QuestionImage';

interface QuizState {
  questions?: Question[];
  progressive?: boolean;
  params?: { topic: string; sector: string; level: string; questionType: string; count: number; difficulty?: string; studentAge?: number; language?: string };
  shuffle?: boolean;
  topic: string;
  sector: string;
  level: string;
  questionType?: string;
  timeLimit: number;
  instantFeedback?: boolean;
  speedRound?: boolean;
}

interface Result {
  questionId: string;
  userAnswer: string | string[];
  correct: boolean | null;
  explanation: string;
  score?: number;
  gradingFeedback?: string;
}

export default function QuizScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as QuizState | null;

  if (!state || (!state.questions?.length && !state.progressive)) {
    navigate('/practice');
    return null;
  }

  const { topic, timeLimit = 0, instantFeedback = false, speedRound = false } = state;

  const [questions, setQuestions] = useState<Question[]>(state.questions || []);
  const [generating, setGenerating] = useState(state.progressive || false);
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [genError, setGenError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const selectedAnswerRef = useRef<string | string[] | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const textAnswerRef = useRef('');
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const resultsRef = useRef<Result[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepExplanation, setDeepExplanation] = useState('');
  const [showDeep, setShowDeep] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (!state.progressive || !state.params) return;
    let cancelled = false;

    (async () => {
      try {
        const allQuestions = await generateQuestionsProgressive(state.params!, (batch, progress) => {
          if (cancelled) return;
          setQuestions(batch);
          setGenProgress(progress);
        });
        if (!cancelled) {
          let final = allQuestions;
          if (state.shuffle) final = [...final].sort(() => Math.random() - 0.5);
          setQuestions(final);
          setGenerating(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setGenError(err.message || 'Failed to generate questions');
          setGenerating(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);
  useEffect(() => {
    textAnswerRef.current = textAnswer;
  }, [textAnswer]);

  const current = questions[currentIndex];
  const [bookmarked, setBookmarked] = useState(() => current ? storage.isBookmarked(current.id) : false);
  const [speaking, setSpeaking] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(30);
  const speedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLast = questions.length > 0 && currentIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const questionStartRef = useRef<number>(Date.now());
  const questionTimingsRef = useRef<QuestionTiming[]>([]);
  const [note, setNote] = useState(() => current ? storage.getQuestionNote(current.id) : '');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (!current) return;
    questionStartRef.current = Date.now();
    setNote(storage.getQuestionNote(current.id));
    setShowNote(false);
  }, [currentIndex, current?.id]);

  const recordTiming = useCallback(() => {
    if (!current) return;
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const existing = questionTimingsRef.current.findIndex((t) => t.questionId === current.id);
    if (existing >= 0) {
      questionTimingsRef.current[existing].timeSpent = elapsed;
    } else {
      questionTimingsRef.current.push({ questionId: current.id, timeSpent: elapsed });
    }
  }, [current?.id]);

  const handleSubmit = useCallback(async () => {
    if (!current) return;
    recordTiming();
    let result: Result;

    const extractLetter = (s: string): string | null => {
      const m = s.trim().match(/^([A-Za-z])/);
      return m ? m[1].toUpperCase() : null;
    };
    const stripContent = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
    const answersMatch = (user: string, correct: string) => {
      const uLetter = extractLetter(user);
      const cLetter = extractLetter(correct);
      if (uLetter && cLetter && uLetter === cLetter) return true;
      return stripContent(user) === stripContent(correct);
    };

    const currentAnswer = selectedAnswerRef.current;
    const currentText = textAnswerRef.current;

    if (current.type === 'MCQ') {
      const correctStr = String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer);
      const userAns = Array.isArray(currentAnswer) ? currentAnswer[0] : (currentAnswer || '');
      const isCorrect = answersMatch(userAns, correctStr);
      result = {
        questionId: current.id,
        userAnswer: currentAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else if (current.type === 'Theory') {
      if (!currentText.trim()) {
        result = { questionId: current.id, userAnswer: '', correct: false, explanation: current.explanation, score: 0 };
      } else {
        setGrading(true);
        const modelAnswer = String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer);
        try {
          const graded = await gradeTheoryAnswer({
            question: current.question,
            studentAnswer: currentText,
            modelAnswer,
            subject: state.sector,
            level: state.level,
            difficulty: current.difficulty,
          });
          result = {
            questionId: current.id,
            userAnswer: currentText,
            correct: graded.score >= 50,
            explanation: current.explanation,
            score: graded.score,
            gradingFeedback: graded.feedback,
          };
        } catch {
          const normalize = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
          const userNorm = normalize(currentText);
          const correctNorm = normalize(modelAnswer);
          const userWords = new Set(userNorm.split(/\s+/));
          const correctWords = new Set(correctNorm.split(/\s+/));
          let overlap = 0;
          correctWords.forEach((w) => { if (userWords.has(w)) overlap++; });
          const ratio = correctWords.size > 0 ? overlap / correctWords.size : 0;
          const score = Math.round(Math.min(100, Math.max(20, ratio * 100)));
          result = { questionId: current.id, userAnswer: currentText, correct: ratio >= 0.6, explanation: current.explanation, score };
        }
        setGrading(false);
      }
    } else if (current.type === 'TrueFalse') {
      const correctStr = String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer);
      const userAns = Array.isArray(currentAnswer) ? currentAnswer[0] : (currentAnswer || '');
      const isCorrect = answersMatch(userAns, correctStr);
      result = {
        questionId: current.id,
        userAnswer: currentAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else {
      const isCorrect = currentText.trim().toLowerCase() === (current.correctAnswer as string).toLowerCase();
      result = {
        questionId: current.id,
        userAnswer: currentText,
        correct: isCorrect,
        explanation: current.explanation,
      };
    }

    const newResults = [...resultsRef.current, result];
    resultsRef.current = newResults;
    setResults(newResults);
    setShowResult(true);
  }, [current, recordTiming]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    if (isLast) {
      if (!showResult) return;
      const allResults = [...resultsRef.current];
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      storage.saveQuestionTimings(questionTimingsRef.current);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
      });
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
      setDeepExplanation('');
      setShowDeep(false);
      setBookmarked(storage.isBookmarked(questions[nextIndex]?.id || ''));
    }
  }, [isLast, showResult, navigate, topic, state, questions.length, currentIndex]);

  useEffect(() => {
    if (timeLimit <= 0 || showResult || generating) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLimit, showResult, generating]);

  useEffect(() => {
    if (timeLeft <= 0 && timeLimit > 0 && !showResult && !generating && questions.length > 0) {
      recordTiming();
      const allResults = [...resultsRef.current];
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      storage.saveQuestionTimings(questionTimingsRef.current);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
      });
    }
  }, [timeLeft, timeLimit, showResult, generating, questions, navigate, topic, state, recordTiming]);

  useEffect(() => {
    if (!speedRound || showResult) return;
    setSpeedTimeLeft(30);
    speedTimerRef.current = setInterval(() => {
      setSpeedTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => { if (speedTimerRef.current) clearInterval(speedTimerRef.current); };
  }, [currentIndex, speedRound, showResult]);

  useEffect(() => {
    if (speedRound && speedTimeLeft <= 0 && !showResult && currentIndex >= 0) {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current);
      handleSubmit();
    }
  }, [speedTimeLeft, speedRound, showResult, currentIndex]);

  const handleBookmark = () => {
    if (!current) return;
    const result = storage.toggleBookmark(current);
    setBookmarked(result);
  };

  const handleSpeak = () => {
    if (!current) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(current.question);
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const handleMCQSelect = (opt: string) => {
    if (showResult) return;
    setSelectedAnswer(opt);
    if (instantFeedback) {
      setTimeout(() => handleSubmit(), 300);
    }
  };

  const handleTrueFalseSelect = (val: string) => {
    if (showResult) return;
    setSelectedAnswer(val);
    if (instantFeedback) {
      setTimeout(() => handleSubmit(), 300);
    }
  };

  const handleDeepExplanation = async () => {
    if (!current) return;
    if (showDeep) { setShowDeep(false); return; }
    setDeepLoading(true);
    setShowDeep(true);
    try {
      const result = await getDeepExplanation({
        question: current.question,
        correctAnswer: String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer),
        explanation: current.explanation,
        subject: current.subject,
      });
      setDeepExplanation(result);
    } catch {
      setDeepExplanation(t('Could not load deep explanation. Please try again.'));
    }
    setDeepLoading(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (generating && questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-[60vh]">
        <Loader2 size={40} className="text-primary-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">Generating your first question...</p>
        {genProgress && <p className="text-sm text-gray-400 mt-2">{genProgress.current} / {genProgress.total}</p>}
        {genError && (
          <div className="text-center mt-4">
            <p className="text-sm text-red-500 mb-3">{genError}</p>
            <button onClick={() => navigate('/practice')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
              {t('Go Back')}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!current) return null;

  const nextReady = currentIndex + 1 < questions.length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); window.speechSynthesis.cancel(); navigate('/practice'); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-2 flex items-center gap-1">
          <ArrowLeft size={14} /> {t('Back to Practice')}
        </button>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{topic}</h2>
          <div className="flex items-center gap-3 ml-2">
            {timeLimit > 0 && (
              <span className={`flex items-center gap-1 text-sm font-mono font-semibold whitespace-nowrap ${
                timeLeft <= 30 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                <Timer size={14} />
                {formatTime(timeLeft)}
              </span>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {currentIndex + 1} / {questions.length}{generating && !isLast ? ' ...' : ''}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        {generating && (
          <div className="mt-2 flex items-center gap-2 text-xs text-primary-500 dark:text-primary-400">
            <Loader2 size={12} className="animate-spin" />
            Generating questions... {genProgress ? `${genProgress.current}/${genProgress.total}` : ''}
          </div>
        )}
        {speedRound && !showResult && (
          <div className="mt-2 flex items-center justify-center">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold font-mono ${
              speedTimeLeft <= 10 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse' :
              speedTimeLeft <= 20 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
              'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
            }`}>
              <Zap size={14} />
              Speed Round: {speedTimeLeft}s
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            showCalculator ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Calculator size={14} /> {t('Calculator')}
        </button>
        <button
          onClick={() => setShowCheatSheet(!showCheatSheet)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            showCheatSheet ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <BookOpen size={14} /> {t('Cheat Sheet')}
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            showNote ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <StickyNote size={14} /> {t('Note')}
        </button>
      </div>

      {showNote && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              storage.setQuestionNote(current.id, e.target.value);
            }}
            placeholder={t('Add a note about this question...')}
            className="w-full px-3 py-2 text-sm border border-yellow-200 dark:border-yellow-700 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-20"
          />
          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">{t('Note saved')}</p>
        </div>
      )}

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
        <div className="mb-4">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
            current.type === 'MCQ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
            current.type === 'Theory' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' :
            current.type === 'TrueFalse' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
            'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
          }`}>
            {current.type}
          </span>
          <span className={`ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded ${
            current.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
            current.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
          }`}>
            {current.difficulty}
          </span>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <p className="text-lg leading-relaxed flex-1 text-gray-100">{current.question}</p>
          <button
            onClick={handleSpeak}
            className="shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={speaking ? 'Stop reading' : 'Read question aloud'}
          >
            {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {current.imageQuery && (
          <QuestionImage query={current.imageQuery} />
        )}

        {showResult && (
          <div className="flex justify-end -mt-4 mb-2">
            <button
              onClick={handleBookmark}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              title={bookmarked ? t('Remove bookmark') : t('Bookmark this question')}
            >
              {bookmarked ? (
                <>
                  <BookmarkCheck size={18} className="text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">{t('Bookmarked')}</span>
                </>
              ) : (
                <>
                  <Bookmark size={18} className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400" />
                  <span className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400">{t('Bookmark')}</span>
                </>
              )}
            </button>
          </div>
        )}

        {current.type === 'MCQ' && current.options && (
          <div className="space-y-3 mb-6">
            {current.options.map((opt, i) => {
              const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
              const correctVal = stripPrefix(String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer));
              const isCorrectOpt = stripPrefix(opt) === correctVal;
              const isSelectedWrong = showResult && selectedAnswer === opt && !isCorrectOpt;
              return (
                <button
                  key={i}
                  onClick={() => handleMCQSelect(opt)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    showResult && isCorrectOpt
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : isSelectedWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : selectedAnswer === opt
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary-400 dark:hover:border-primary-500'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {current.type === 'TrueFalse' && (
          <div className="flex gap-3 mb-6">
            {['True', 'False'].map((val) => {
              const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
              const correctVal = stripPrefix(String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer));
              const isCorrect = stripPrefix(val) === correctVal;
              const isSelectedWrong = showResult && selectedAnswer === val && !isCorrect;
              return (
                <button
                  key={val}
                  onClick={() => handleTrueFalseSelect(val)}
                  disabled={showResult}
                  className={`flex-1 py-4 rounded-lg border-2 text-lg font-semibold transition ${
                    showResult && isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : isSelectedWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : selectedAnswer === val
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary-400 dark:hover:border-primary-500'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        )}

        {(current.type === 'Theory' || current.type === 'FillBlank') && (
          <div className="mb-6">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={current.type === 'FillBlank' ? t('Type your answer here...') : t('Type your theory answer here...')}
              disabled={showResult}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-32"
            />
          </div>
        )}

        {showResult && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              {results[results.length - 1]?.correct ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : (
                <X size={20} className="text-red-500" />
              )}
              <span className={`font-semibold ${results[results.length - 1]?.correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {results[results.length - 1]?.correct ? t('Correct!') : t('Incorrect')}
              </span>
              {results[results.length - 1]?.score !== undefined && results[results.length - 1]?.score !== null && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({results[results.length - 1]?.score}/100)
                </span>
              )}
            </div>
            {results[results.length - 1]?.gradingFeedback && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-line">{results[results.length - 1]?.gradingFeedback}</p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">{current.explanation}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDeepExplanation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800/40 transition"
              >
                <Lightbulb size={14} />
                {deepLoading ? t('Loading question...') : showDeep ? t('Hide Deep Explanation') : t('Deep Explanation')}
              </button>
            </div>
            {showDeep && deepExplanation && (
              <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800">
                <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">{t('Deep Explanation')}</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{deepExplanation}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={grading || ((current.type === 'MCQ' || current.type === 'TrueFalse') && !selectedAnswer) || (current.type === 'Theory' && !textAnswer.trim())}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {t('Submit Answer')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!nextReady && !isLast}
              className={`flex-1 py-3 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                !nextReady && !isLast
                  ? 'bg-gray-500 cursor-wait'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {!nextReady && !isLast ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('Generating...')}
                </>
              ) : (
                <>
                  {isLast ? t('Results') : t('Next Question')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          )}
        </div>
        </div>
      </BorderGlow>

      {showCalculator && <CalculatorPanel onClose={() => setShowCalculator(false)} />}
      {showCheatSheet && <CheatSheet subject={current.subject} topic={current.topic} onClose={() => setShowCheatSheet(false)} />}
    </div>
  );
}
