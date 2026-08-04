import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Timer, ChevronDown, ChevronUp, Loader2, Bookmark, BookmarkCheck, Volume2, VolumeX, Calculator, BookOpen, Zap, Lightbulb, X, StickyNote } from 'lucide-react';
import type { Question, QuestionTiming } from '../../types';
import { getDeepExplanation, gradeTheoryAnswer } from '../../services/api';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';
import { useLanguage } from '../../contexts/LanguageContext';
import CalculatorPanel from './CalculatorPanel';
import CheatSheet from './CheatSheet';
import QuestionImage from './QuestionImage';

interface QuizState {
  questions: Question[];
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

  if (!state?.questions?.length) {
    navigate('/practice');
    return null;
  }

  const { questions: rawQuestions, topic, timeLimit = 0, instantFeedback = false, speedRound = false } = state;

  const [questions] = useState<Question[]>(() => {
    let qs = rawQuestions;
    if (state.shuffle) qs = [...qs].sort(() => Math.random() - 0.5);
    return qs;
  });
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
  const [note, setNote] = useState(() => storage.getQuestionNote(current.id));
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    questionStartRef.current = Date.now();
    setNote(storage.getQuestionNote(current.id));
    setShowNote(false);
  }, [currentIndex]);

  const recordTiming = useCallback(() => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const existing = questionTimingsRef.current.findIndex((t) => t.questionId === current.id);
    if (existing >= 0) {
      questionTimingsRef.current[existing].timeSpent = elapsed;
    } else {
      questionTimingsRef.current.push({ questionId: current.id, timeSpent: elapsed });
    }
  }, [current.id]);

  const handleSubmit = useCallback(async () => {
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
      const allResults = [...resultsRef.current];
      if (!showResult) return;
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      storage.saveQuestionTimings(questionTimingsRef.current);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
      });
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
      setDeepExplanation('');
      setShowDeep(false);
      setBookmarked(storage.isBookmarked(questions[currentIndex + 1]?.id || ''));
    }
  }, [isLast, results, showResult, navigate, topic, state, questions.length]);

  const handleMCQSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
    selectedAnswerRef.current = option;
    if (instantFeedback && (current.type === 'MCQ' || current.type === 'TrueFalse')) {
      setTimeout(() => {
        handleSubmit();
      }, 300);
    }
  };

  const handleBookmark = () => {
    const added = storage.toggleBookmark(current);
    setBookmarked(added);
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

  const handleDeepExplanation = async () => {
    if (deepExplanation) {
      setShowDeep(!showDeep);
      return;
    }
    setDeepLoading(true);
    try {
      const text = await getDeepExplanation({
        question: current.question,
        correctAnswer: Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer,
        explanation: current.explanation,
        subject: current.subject,
      });
      setDeepExplanation(text);
      setShowDeep(true);
    } catch {
      setDeepExplanation('Failed to load deeper explanation. Please try again.');
      setShowDeep(true);
    } finally {
      setDeepLoading(false);
    }
  };

  const goToResults = useCallback(() => {
    recordTiming();
    const allResults = [...resultsRef.current];
    const correctCount = allResults.filter((r) => r.correct === true).length;
    const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
    storage.saveQuestionTimings(questionTimingsRef.current);
    navigate('/results', {
      state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
    });
  }, [navigate, topic, state, questions, recordTiming]);

  useEffect(() => {
    if (timeLeft <= 0 || timeLimit <= 0 || showResult || results.length >= questions.length) return;

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
  }, [timeLimit, showResult, results.length, questions.length]);

  useEffect(() => {
    if (timeLimit > 0 && timeLeft === 0 && !showResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      recordTiming();
      const finalResults = [...resultsRef.current];
      if (finalResults.length < questions.length) {
        for (let i = resultsRef.current.length; i < questions.length; i++) {
          finalResults.push({
            questionId: questions[i].id,
            userAnswer: '',
            correct: false,
            explanation: questions[i].explanation,
          });
        }
      }
      const correctCount = finalResults.filter((r) => r.correct === true).length;
      const totalScore = finalResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      storage.saveQuestionTimings(questionTimingsRef.current);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: finalResults, correctCount, totalCount: questions.length, totalScore, questionTimings: questionTimingsRef.current },
      });
    }
  }, [timeLeft, timeLimit, showResult, results, questions, navigate, topic, state, recordTiming]);

  useEffect(() => {
    if (!speedRound || showResult) return;
    setSpeedTimeLeft(30);
    speedTimerRef.current = setInterval(() => {
      setSpeedTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current);
    };
  }, [currentIndex, speedRound, showResult]);

  // Speed timer auto-submit (outside setState updater)
  useEffect(() => {
    if (speedRound && speedTimeLeft <= 0 && !showResult && currentIndex >= 0) {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current);
      handleSubmit();
    }
  }, [speedTimeLeft, speedRound, showResult, currentIndex]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
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
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              );
            })}
          </div>
        )}

        {current.type === 'TrueFalse' && (
          <div className="flex gap-4 mb-6">
            {['True', 'False'].map((opt) => {
              const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
              const correctVal = stripPrefix(String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer));
              const isCorrectOpt = stripPrefix(opt) === correctVal;
              const isSelectedWrong = showResult && selectedAnswer === opt && !isCorrectOpt;
              return (
                <button
                  key={opt}
                  onClick={() => handleMCQSelect(opt)}
                  disabled={showResult}
                  className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition ${
                    showResult && isCorrectOpt
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : isSelectedWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : selectedAnswer === opt
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {(current.type === 'Theory' || current.type === 'FillBlank' || current.type === 'Matching') && (
          <div className="mb-6">
            <textarea
              value={textAnswer}
              onChange={(e) => { setTextAnswer(e.target.value); textAnswerRef.current = e.target.value; }}
              disabled={showResult}
              placeholder={current.type === 'Theory' ? 'Type your answer here...' : 'Enter your answer...'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-32"
            />
          </div>
        )}

        {showResult && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary-500 rounded-lg">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">{t('Explanation')}</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{current.explanation}</p>
            {current.imageQuery && (
              <img
                src={`https://loremflickr.com/400/250/${encodeURIComponent(current.imageQuery)}`}
                alt={current.imageQuery}
                className="mt-3 rounded-lg w-full max-w-sm object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {current.type === 'Theory' && grading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" /> {t('Grading your answer...')}
              </div>
            )}
            {current.type === 'Theory' && !grading && results[results.length - 1]?.score != null && (
              <>
                <p className="mt-2 font-semibold text-primary-700 dark:text-primary-300">
                  Score: {results[results.length - 1].score}/100
                </p>
                {results[results.length - 1].gradingFeedback && (
                  <p className="mt-1 text-xs text-white/50 italic">{results[results.length - 1].gradingFeedback}</p>
                )}
              </>
            )}
            {current.correctAnswer && current.type !== 'Theory' && (
              <p className="mt-2 text-sm text-green-700 dark:text-green-400 font-medium">
                Correct Answer: {(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer).replace(/^[A-Za-z][.\s]+/, '').trim()}
              </p>
            )}
            <button
              onClick={handleDeepExplanation}
              disabled={deepLoading}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition"
            >
              {deepLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : showDeep ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              {deepLoading ? t('Loading question...') : showDeep ? t('Hide Deep Explanation') : t('Deep Explanation')}
            </button>
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
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <>
                  {isLast ? t('Results') : t('Next Question')}
                  <ArrowRight size={18} />
                </>
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
