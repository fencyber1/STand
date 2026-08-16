import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { Assessment, Question, Submission } from '../../types/classroom';

export default function StudentAssessmentScreen() {
  const { roomId, assessmentId } = useParams<{ roomId: string; assessmentId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roomId && assessmentId) {
      loadRoom(roomId);
      loadAssessment();
      loadSubmission();
    }

    const unsub = subscribeToCurrentRoom();
    return () => { if (unsub) unsub(); };
  }, [roomId, assessmentId, loadRoom]);

  const loadAssessment = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const data = await classroomService.getAssessmentById(assessmentId);
      if (data) {
        setAssessment(data);
        if (data.durationMinutes > 0) {
          setTimeRemaining(data.durationMinutes * 60);
        }
      } else {
        setError('Assessment not found');
        navigate(`/classroom/${roomId}/learn`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmission = async () => {
    if (!roomId || !assessmentId) return;
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) return;

      const submissionData = await classroomService.getStudentSubmission(roomId, assessmentId, user.uid);
      if (submissionData) {
        setSubmission(submissionData);
        if (submissionData.answers) {
          setAnswers(submissionData.answers);
        }
        if (submissionData.status === 'submitted' || submissionData.status === 'graded' || submissionData.status === 'released') {
        }
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    }
  };

  useEffect(() => {
    if (!assessment || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [assessment, timeRemaining]);

  const handleAutoSubmit = useCallback(async () => {
    if (!submission || submission.status !== 'in-progress') return;
    await submitAssessment();
  }, [submission]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (assessment?.questions?.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const goToPrevious = () => goToQuestion(currentQuestionIndex - 1);
  const goToNext = () => goToQuestion(currentQuestionIndex + 1);

  const submitAssessment = async () => {
    if (!roomId || !assessmentId || !assessment) return;

    setSubmitting(true);
    setError('');

    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) throw new Error('Not authenticated');

      const newSubmission: Omit<Submission, 'id'> = {
        assessmentId,
        studentId: user.uid,
        roomId,
        startedAt: new Date(),
        submittedAt: new Date(),
        answers,
        status: 'submitted',
        aiGraded: false,
        teacherReviewed: false,
      };

      await classroomService.submitAssessment(newSubmission);
      navigate(`/classroom/${roomId}/learn/assessments/${assessmentId}/results`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = assessment?.questions?.[currentQuestionIndex];

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assessment?.questions?.length || 0;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isSubmitted = submission && ['submitted', 'graded', 'released'].includes(submission.status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">Assessment Not Available</p>
          <p>{error || 'This assessment could not be loaded.'}</p>
          <Button onClick={() => navigate(`/classroom/${roomId}/learn`)} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Assessment Submitted</h2>
          <p className="text-slate-400 mb-6">Your assessment has been submitted successfully.</p>
          <Button onClick={() => navigate(`/classroom/${roomId}/learn/assessments/${assessmentId}/results`)}>
            View Results
          </Button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startsAt = assessment.startsAt ? new Date(assessment.startsAt) : null;
  const endsAt = assessment.endsAt ? new Date(assessment.endsAt) : null;

  if (startsAt && now < startsAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">Assessment Not Started</p>
          <p>This assessment begins on {startsAt.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  if (endsAt && now > endsAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl font-medium text-white mb-2">Assessment Ended</p>
          <p>This assessment ended on {endsAt.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/learn`)} disabled={submitting}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{assessment.title}</h1>
              <p className="text-sm text-slate-400">
                {totalQuestions} questions • {assessment.durationMinutes} min • {assessment.totalMarks} marks
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
            timeRemaining < 300 ? 'bg-red-900/30 border border-red-500' : 'bg-slate-800 border border-slate-700'
          }`}>
            <Clock className={`w-5 h-5 ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-mono text-lg font-bold text-white">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-slate-700 overflow-y-auto bg-slate-900/50">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white mb-2">Questions</h3>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{answeredCount} / {totalQuestions} answered</p>
          </div>

          <nav className="p-2 space-y-1">
            {assessment.questions?.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentQuestionIndex;
              const isFlagged = flaggedQuestions.has(q.id);

              return (
                <button key={q.id} onClick={() => goToQuestion(idx)} className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                  isCurrent ? 'bg-indigo-600/30 text-white' :
                  isAnswered ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30' :
                  isFlagged ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30' :
                  'text-slate-400 hover:bg-slate-700/50'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCurrent ? 'bg-indigo-500 text-white' :
                    isAnswered ? 'bg-green-500 text-white' :
                    isFlagged ? 'bg-yellow-500 text-white' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xs flex-1 truncate">{q.type === 'multiple_choice' ? 'MC' : q.type === 'true_false' ? 'T/F' : 'SA'}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-slate-700 rounded-lg text-sm font-medium text-white">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <Badge variant={currentQuestion.difficulty === 'easy' ? 'default' : currentQuestion.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                    {currentQuestion.marks} marks
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleFlagQuestion(currentQuestion.id)} className={flaggedQuestions.has(currentQuestion.id) ? 'bg-yellow-600/20 text-yellow-400' : ''}>
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Card className="bg-slate-800 border-slate-700 mb-6">
                <div className="p-6">
                  <p className="text-lg text-white whitespace-pre-wrap mb-6">{currentQuestion.text}</p>

                  {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, optIdx) => (
                        <label key={optIdx} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === optIdx
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}>
                          <input
                            type="radio"
                            name={`q_${currentQuestion.id}`}
                            value={optIdx}
                            checked={answers[currentQuestion.id] === optIdx}
                            onChange={() => handleAnswerChange(currentQuestion.id, optIdx)}
                            className="w-5 h-5 text-indigo-500"
                          />
                          <span className="w-8 h-8 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-medium text-slate-300">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-slate-300 flex-1">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'true_false' && (
                    <div className="space-y-3">
                      {['True', 'False'].map((option, optIdx) => (
                        <label key={optIdx} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === optIdx
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}>
                          <input
                            type="radio"
                            name={`q_${currentQuestion.id}`}
                            value={optIdx}
                            checked={answers[currentQuestion.id] === optIdx}
                            onChange={() => handleAnswerChange(currentQuestion.id, optIdx)}
                            className="w-5 h-5 text-indigo-500"
                          />
                          <span className="w-10 h-10 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-medium text-slate-300">
                            {option === 'True' ? 'T' : 'F'}
                          </span>
                          <span className="text-slate-300 text-lg">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'short_answer' && (
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full bg-slate-900 border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}

                  {currentQuestion.type === 'essay' && (
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Write your essay response here..."
                      rows={8}
                      className="w-full bg-slate-900 border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}

                  {currentQuestion.type === 'case_study' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-300 whitespace-pre-wrap">{currentQuestion.text}</p>
                      </div>
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Analyze the case and provide your response..."
                        rows={6}
                        className="w-full bg-slate-900 border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex justify-between pt-4 border-t border-slate-700">
                <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{currentQuestionIndex + 1} / {totalQuestions}</span>
                </div>
                <Button variant={currentQuestionIndex === totalQuestions - 1 ? 'default' : 'outline'} onClick={currentQuestionIndex === totalQuestions - 1 ? () => setShowSubmitConfirm(true) : goToNext} className={currentQuestionIndex === totalQuestions - 1 ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                  {currentQuestionIndex === totalQuestions - 1 ? <>Submit <Send className="w-4 h-4 ml-2" /></> : <>Next <ChevronRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Submit Assessment?</h3>
            </div>
            <p className="text-slate-300 mb-4">
              You have answered {answeredCount} of {totalQuestions} questions.
              {answeredCount < totalQuestions && <span className="text-yellow-400 ml-1"> ({totalQuestions - answeredCount} unanswered)</span>}
            </p>
            <p className="text-sm text-slate-400 mb-6">Once submitted, you cannot change your answers.</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)}>Continue Working</Button>
              <Button onClick={submitAssessment} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting ? <>Submit <Loader2 className="w-4 h-4 ml-2 animate-spin" /></> : <>Submit <Send className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ variant = 'secondary', children, className = '' }: { variant?: 'default' | 'secondary' | 'destructive'; children: React.ReactNode; className?: string }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  const variants = { default: 'bg-green-600 text-white', secondary: 'bg-yellow-600 text-white', destructive: 'bg-red-600 text-white' };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}