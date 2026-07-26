import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Timer } from 'lucide-react';
import type { Question } from '../../types';
import BorderGlow from '../ui/BorderGlow';

interface QuizState {
  questions: Question[];
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  timeLimit: number;
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

  const { questions, topic, timeLimit = 0 } = state;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = questions[currentIndex];
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
    if (isLast) {
      const allResults = [...results];
      if (!showResult) return;
      const correctCount = allResults.filter((r) => r.correct === true).length;
      const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
      navigate('/results', {
        state: { topic, sector: state.sector, level: state.level, results: allResults, correctCount, totalCount: questions.length, totalScore },
      });
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
    }
  }, [isLast, results, showResult, navigate, topic, state, questions.length]);

  const handleMCQSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
  };

  const goToResults = useCallback(() => {
    const allResults = [...results];
    const correctCount = allResults.filter((r) => r.correct === true).length;
    const totalScore = allResults.reduce((s, r) => s + (r.score || (r.correct ? 100 : 0)), 0);
    navigate('/results', {
      state: { topic, sector: state.sector, level: state.level, results: allResults, correctCount, totalCount: questions.length, totalScore },
    });
  }, [results, navigate, topic, state, questions.length]);

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
        state: { topic, sector: state.sector, level: state.level, results: finalResults, correctCount, totalCount: questions.length, totalScore },
      });
    }
  }, [timeLeft, timeLimit, showResult, results, questions, navigate, topic, state]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); navigate('/practice'); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-2 flex items-center gap-1">
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

        <p className="text-gray-800 dark:text-gray-100 text-lg mb-6 leading-relaxed">{current.question}</p>

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
    </div>
  );
}
