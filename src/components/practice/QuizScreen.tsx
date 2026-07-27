import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Timer, ChevronDown, ChevronUp, Loader2, Bookmark, BookmarkCheck, Volume2, VolumeX, Calculator, BookOpen, Zap, Lightbulb, X } from 'lucide-react';
import type { Question } from '../../types';
import { getDeepExplanation } from '../../services/api';
import { storage } from '../../services/storage';
import BorderGlow from '../ui/BorderGlow';
import CalculatorPanel from './CalculatorPanel';
import CheatSheet from './CheatSheet';

const FUN_FACTS = [
  'Octopuses have three hearts and blue blood.',
  'Honey never spoils — edible after 3000 years.',
  'Bananas are berries, but strawberries aren\'t.',
  'A group of flamingos is called a "flamboyance."',
  'The human body has about 37.2 trillion cells.',
  'Light takes 8 minutes to travel from the Sun to Earth.',
  'There are more stars in the universe than grains of sand on Earth.',
  'Water can boil and freeze at the same time (triple point).',
  'A neutron star is so dense a teaspoon weighs 6 billion tons.',
  'DNA in all your cells would stretch to Pluto and back.',
  'The Amazon rainforest produces 20% of the world\'s oxygen.',
  'Venus spins backwards compared to most planets.',
  'Your brain uses 20% of your body\'s total energy.',
  'Glass is actually a liquid that flows very slowly.',
  'The Moon has moonquakes just like Earth has earthquakes.',
  'Cows have best friends and get stressed when separated.',
  'Sound travels 4x faster in water than in air.',
  'The Great Wall of China is visible from space with the naked eye.',
  'A day on Venus is longer than a year on Venus.',
  'Your bones are stronger than steel per unit weight.',
  'Butterflies taste with their feet.',
  'The shortest war in history lasted 38 minutes.',
  'Hot water freezes faster than cold water (Mpemba effect).',
  'There are more possible chess games than atoms in the observable universe.',
  'The human eye can distinguish about 10 million different colors.',
];

interface QuizState {
  questions: Question[];
  topic: string;
  sector: string;
  level: string;
  questionType: string;
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
}

export default function QuizScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuizState | null;

  if (!state?.questions?.length) {
    navigate('/practice');
    return null;
  }

  const { questions, topic, timeLimit = 0, instantFeedback = false, speedRound = false } = state;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepExplanation, setDeepExplanation] = useState('');
  const [showDeep, setShowDeep] = useState(false);

  const current = questions[currentIndex];
  const [bookmarked, setBookmarked] = useState(() => storage.isBookmarked(current.id));
  const [speaking, setSpeaking] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [currentFact, setCurrentFact] = useState('');
  const [showFact, setShowFact] = useState(false);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(30);
  const speedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLast = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSubmit = useCallback(() => {
    let result: Result;
    const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
    const toStr = (v: string | string[] | null): string => Array.isArray(v) ? (v[0] || '') : (v || '');

    if (current.type === 'MCQ') {
      const correctStr = String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer);
      const userAns = Array.isArray(selectedAnswer) ? selectedAnswer[0] : (selectedAnswer || '');
      const isCorrect = stripPrefix(userAns) === stripPrefix(correctStr);
      result = {
        questionId: current.id,
        userAnswer: selectedAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else if (current.type === 'Theory') {
      const score = Math.min(100, Math.max(40, textAnswer.length * 2));
      result = {
        questionId: current.id,
        userAnswer: textAnswer,
        correct: null,
        explanation: current.explanation,
        score,
      };
    } else if (current.type === 'TrueFalse') {
      const correctStr = String(Array.isArray(current.correctAnswer) ? current.correctAnswer[0] : current.correctAnswer);
      const userAns = Array.isArray(selectedAnswer) ? selectedAnswer[0] : (selectedAnswer || '');
      const isCorrect = stripPrefix(userAns) === stripPrefix(correctStr);
      result = {
        questionId: current.id,
        userAnswer: selectedAnswer || '',
        correct: isCorrect,
        explanation: current.explanation,
      };
    } else {
      const isCorrect = textAnswer.trim().toLowerCase() === (current.correctAnswer as string).toLowerCase();
      result = {
        questionId: current.id,
        userAnswer: textAnswer,
        correct: isCorrect,
        explanation: current.explanation,
      };
    }

    setResults((prev) => [...prev, result]);
    setShowResult(true);
  }, [current, selectedAnswer, textAnswer]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    if (isLast) {
      const allResults = [...results];
      if (!showResult) return;
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore },
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
    const text = current.question;
    const utterance = new SpeechSynthesisUtterance(text);
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
    } catch (err) {
      setDeepExplanation('Failed to load deeper explanation. Please try again.');
      setShowDeep(true);
    } finally {
      setDeepLoading(false);
    }
  };

  const goToResults = useCallback(() => {
    const allResults = [...results];
    const correctCount = allResults.filter((r) => r.correct === true).length;
    const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
    navigate('/results', {
      state: { topic, sector: state.sector, level: state.level, questions, results: allResults, correctCount, totalCount: questions.length, totalScore },
    });
  }, [results, navigate, topic, state, questions]);

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
      const finalResults = [...results];
      if (finalResults.length < questions.length) {
        const stripPrefix = (s: string) => s.replace(/^[A-Za-z][.\s]+/, '').trim().toLowerCase();
        for (let i = results.length; i < questions.length; i++) {
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
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, questions, results: finalResults, correctCount, totalCount: questions.length, totalScore },
      });
    }
  }, [timeLeft, timeLimit, showResult, results, questions, navigate, topic, state]);

  useEffect(() => {
    if (!speedRound || showResult) return;
    setSpeedTimeLeft(30);
    speedTimerRef.current = setInterval(() => {
      setSpeedTimeLeft((prev) => {
        if (prev <= 1) {
          if (speedTimerRef.current) clearInterval(speedTimerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current);
    };
  }, [currentIndex, speedRound, showResult]);

  useEffect(() => {
    if (!showResult || isLast) return;
    const fact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    setCurrentFact(fact);
    setShowFact(true);
  }, [showResult, isLast]);

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
          <ArrowLeft size={14} /> Back to Practice
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
          <Calculator size={14} /> Calculator
        </button>
        <button
          onClick={() => setShowCheatSheet(!showCheatSheet)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            showCheatSheet ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <BookOpen size={14} /> Cheat Sheet
        </button>
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

        <div className="flex items-start gap-2 mb-6">
          <p className="text-gray-800 dark:text-gray-100 text-lg leading-relaxed flex-1">{current.question}</p>
          <button
            onClick={handleSpeak}
            className="shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={speaking ? 'Stop reading' : 'Read question aloud'}
          >
            {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {showResult && (
          <div className="flex justify-end -mt-4 mb-2">
            <button
              onClick={handleBookmark}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
            >
              {bookmarked ? (
                <>
                  <BookmarkCheck size={18} className="text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">Bookmarked</span>
                </>
              ) : (
                <>
                  <Bookmark size={18} className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400" />
                  <span className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400">Bookmark</span>
                </>
              )}
            </button>
          </div>
        )}

        {current.type === 'MCQ' && current.options && (
          <div className="space-y-3 mb-6">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(opt)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  showResult && opt === current.correctAnswer
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : showResult && selectedAnswer === opt && opt !== current.correctAnswer
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : selectedAnswer === opt
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
                onClick={() => handleMCQSelect(opt)}
                disabled={showResult}
                className={`flex-1 p-4 rounded-lg border-2 text-center font-medium transition ${
                  showResult && opt === current.correctAnswer
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : showResult && selectedAnswer === opt && opt !== current.correctAnswer
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : selectedAnswer === opt
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {(current.type === 'Theory' || current.type === 'FillBlank' || current.type === 'Matching') && (
          <div className="mb-6">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={showResult}
              placeholder={current.type === 'Theory' ? 'Type your answer here...' : 'Enter your answer...'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-32"
            />
          </div>
        )}

        {showResult && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary-500 rounded-lg">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">Explanation</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{current.explanation}</p>
            {current.imageQuery && (
              <img
                src={`https://loremflickr.com/400/250/${encodeURIComponent(current.imageQuery)}`}
                alt={current.imageQuery}
                className="mt-3 rounded-lg w-full max-w-sm object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {current.type === 'Theory' && results[results.length - 1]?.score != null && (
              <p className="mt-2 font-semibold text-primary-700 dark:text-primary-300">
                Score: {results[results.length - 1].score}/100
              </p>
            )}
            {current.correctAnswer && current.type !== 'Theory' && (
              <p className="mt-2 text-sm text-green-700 dark:text-green-400 font-medium">
                Correct Answer: {Array.isArray(current.correctAnswer) ? current.correctAnswer.join(', ') : current.correctAnswer}
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
              {deepLoading ? 'Loading deeper explanation...' : showDeep ? 'Hide Deep Explanation' : 'Deep Explanation'}
            </button>
            {showDeep && deepExplanation && (
              <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800">
                <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">Deep Explanation</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{deepExplanation}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={(current.type === 'MCQ' || current.type === 'TrueFalse') && !selectedAnswer}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              {isLast ? 'View Results' : 'Next Question'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
        </div>
      </BorderGlow>

      {showFact && currentFact && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
          <div className="flex items-start gap-2">
            <Lightbulb size={18} className="text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Did you know?</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{currentFact}</p>
            </div>
            <button
              onClick={() => setShowFact(false)}
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {showCalculator && <CalculatorPanel onClose={() => setShowCalculator(false)} />}
      {showCheatSheet && <CheatSheet subject={current.subject} topic={current.topic} onClose={() => setShowCheatSheet(false)} />}
    </div>
  );
}
