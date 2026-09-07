import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../contexts/ClassroomContext';
import { useAuth } from '../contexts/AuthContext';
import { topicService, TopicProgress } from '../services/topicService';
import { classroomService } from '../services/classroomService';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import NotificationBell from '../components/notifications/NotificationBell';
import {
  ClassroomMobileTabs,
  greetingFor,
  initialsOf,
} from '../components/classroom/ClassroomMobileTabs';
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  FileText,
  Users,
  User,
  Award,
  ClipboardList,
  Menu,
  Home,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { Topic, Assessment } from '../types/classroom';

/**
 * Student dashboard showing their classroom learning progress.
 * Uses real topic data and student progress tracking.
 * Does not affect any existing components or flows.
 */
export default function StudentDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, TopicProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchTopics();
      fetchProgress();
      fetchAssessments();
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  const fetchTopics = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await topicService.getTopicsByRoom(roomId);
      const publishedTopics = data.filter((t: Topic) => t.status === 'published');
      setTopics(publishedTopics);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async () => {
    if (!roomId) return;
    try {
      const data = await classroomService.getAssessmentsByRoom(roomId);
      const liveAssessments = data.filter(
        (a: Assessment) => a.status === 'live' || a.status === 'scheduled'
      );
      setAssessments(liveAssessments);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
    }
  };

  const fetchProgress = async () => {
    if (!roomId) return;
    try {
      const progressData = await topicService.getStudentProgress(roomId);
      const map = new Map<string, TopicProgress>();
      progressData.forEach((p: TopicProgress) => map.set(p.topicId, p));
      setProgressMap(map);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const getProgress = (topicId: string) => {
    return progressMap.get(topicId) || { progress: 0, completed: false, timeSpent: 0, lastSection: undefined };
  };

  const currentTopic = topics.find(t => {
    const p = getProgress(t.id);
    return p.progress > 0 && !p.completed;
  }) || topics.find(t => !getProgress(t.id).completed) || topics[0];

  const completedCount = topics.filter(t => getProgress(t.id).completed).length;
  const inProgressCount = topics.filter(t => {
    const p = getProgress(t.id);
    return p.progress > 0 && !p.completed;
  }).length;

  const recentTopics = topics.slice(0, 5).map(t => {
    const p = getProgress(t.id);
    return {
      id: t.id,
      title: t.title,
      completed: p.completed,
      progress: p.progress,
    };
  });

  // Real assignments derived from live/scheduled assessments
  const assignments = assessments.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    dueDate: a.endsAt ? new Date(a.endsAt) : a.startsAt ? new Date(a.startsAt) : null,
    type: 'assessment' as const,
    completed: false,
  }));

  // Weak areas derived from started-but-low-progress topics
  const weakAreas = topics
    .filter((t) => {
      const p = getProgress(t.id);
      return p.progress > 0 && p.progress < 50 && !p.completed;
    })
    .slice(0, 5)
    .map((t) => t.title);

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading classroom...</div>
      </div>
    );
  }

  const totalProgress = topics.length > 0
    ? Math.round((completedCount / topics.length) * 100)
    : 0;

  const { user } = useAuth();
  const displayName = user?.fullName || 'Student';
  const firstName = displayName.split(' ')[0];
  const assignmentsTarget = assessments.length > 0
    ? `/classroom/${roomId}/learn/assessments/${assessments[0].id}`
    : `/classroom/${roomId}/learn/topics`;
  const mobileTabs = [
    { label: 'Home', icon: Home, to: `/classroom/${roomId}/learn`, end: true },
    { label: 'Learn', icon: BookOpen, to: `/classroom/${roomId}/learn/topics` },
    { label: 'Assignments', icon: ClipboardList, to: assignmentsTarget },
    { label: 'Class', icon: Users, to: `/classroom/${roomId}/learn/announcements` },
    { label: 'Profile', icon: User, to: '/profile' },
  ];

  return (
    <>
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 hidden lg:flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
            <p className="text-slate-400">
              {currentRoom.course} · {currentRoom.level}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/classroom')}>
            Exit
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {/* MY CLASSROOM Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">MY CLASSROOM</h2>

          {currentTopic && (
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {currentTopic.title}
                  </h3>
                  <Badge variant="secondary">
                    {getProgress(currentTopic.id).completed ? 'Completed' : `${getProgress(currentTopic.id).progress}% Complete`}
                  </Badge>
                </div>

                {currentTopic.description && (
                  <p className="text-slate-300 mb-4">
                    {currentTopic.description}
                  </p>
                )}

                <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${getProgress(currentTopic.id).progress}%` }}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/classroom/${roomId}/learn/topics/${currentTopic.id}`)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Continue →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/classroom/${roomId}/learn/topics`)}
                  >
                    View All Topics
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* Upcoming Assessments */}
        {assessments.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Upcoming Assessments
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/classroom/${roomId}/learn/assessments`)}
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {assessments.slice(0, 3).map((assessment) => {
                const now = new Date();
                const startsAt = assessment.startsAt ? new Date(assessment.startsAt) : null;
                const endsAt = assessment.endsAt ? new Date(assessment.endsAt) : null;
                const isUpcoming = Boolean(startsAt && now < startsAt);
                const isLive = Boolean((!startsAt || now >= startsAt) && (!endsAt || now <= endsAt));

                return (
                  <Card key={assessment.id} className="bg-slate-800 border-slate-700 hover:border-indigo-500 transition-colors">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isLive ? 'bg-green-600/20' : 'bg-blue-600/20'
                        }`}>
                          <ClipboardList className={`w-6 h-6 ${isLive ? 'text-green-400' : 'text-blue-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{assessment.title}</h3>
                          <p className="text-sm text-slate-400">
                            {assessment.questionCount} questions • {assessment.durationMinutes} min • {assessment.totalMarks} marks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            isLive ? 'default' :
                            isUpcoming ? 'secondary' :
                            'destructive'
                          }
                        >
                          {isLive ? 'Live' : isUpcoming ? 'Upcoming' : 'Ended'}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/classroom/${roomId}/learn/assessments/${assessment.id}`)}
                          disabled={isUpcoming}
                          className={isUpcoming ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {isUpcoming ? 'Starts Soon' : 'Take Assessment'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Progress Summary */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">My Progress</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/classroom/${roomId}/learn/progress`)}
            >
              View Details
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <div className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{topics.length}</p>
                <p className="text-sm text-slate-400">Total Topics</p>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <div className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <p className="text-sm text-slate-400">Completed</p>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <div className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{inProgressCount}</p>
                <p className="text-sm text-slate-400">In Progress</p>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <div className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{totalProgress}%</p>
                <p className="text-sm text-slate-400">Overall</p>
              </div>
            </Card>
          </div>
        </section>

        {/* MY LEARNING Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">MY LEARNING</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/classroom/${roomId}/learn/topics`)}
            >
              All Topics
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Topics Progress */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <h3 className="font-medium text-white mb-3">Topics</h3>
                  <div className="space-y-3">
                    {recentTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/classroom/${roomId}/learn/topics/${topic.id}`)}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          {topic.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{topic.title}</p>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-sm text-slate-300">{topic.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Assignments */}
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <h3 className="font-medium text-white mb-3">Assignments</h3>
                  {assignments.length === 0 ? (
                    <p className="text-sm text-slate-400">No upcoming assessments. Enjoy the break!</p>
                  ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/classroom/${roomId}/learn/assessments/${assignment.id}`)}
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{assignment.title}</p>
                          <p className="text-sm text-slate-400">
                            {assignment.dueDate ? `Due ${assignment.dueDate.toLocaleDateString()}` : 'No due date set'}
                          </p>
                        </div>
                        <Badge
                          variant={assignment.completed ? 'default' : 'secondary'}
                        >
                          {assignment.completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </Card>
            </div>

            {/* AI Recommendations & Weak Areas */}
            <div className="space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-medium text-white">AI Recommendations</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {weakAreas.slice(0, 2).map((area) => (
                      <li key={area}>• Revisit “{area}” and retake its knowledge checks</li>
                    ))}
                    {inProgressCount > 0 && (
                      <li>• Continue your {inProgressCount} in-progress {inProgressCount === 1 ? 'topic' : 'topics'}</li>
                    )}
                    {assessments.length > 0 && (
                      <li>• Prepare for “{assessments[0].title}”</li>
                    )}
                    {weakAreas.length === 0 && inProgressCount === 0 && assessments.length === 0 && (
                      <li>• Start your first topic to get personalized tips</li>
                    )}
                  </ul>
                </div>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-red-400" />
                    <h3 className="font-medium text-white">Weak Areas</h3>
                  </div>
                  {weakAreas.length === 0 ? (
                    <p className="text-sm text-slate-400">No weak areas right now. Keep it up!</p>
                  ) : (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {weakAreas.map((area) => (
                      <li key={area} className="flex items-center justify-between">
                        <span>{area}</span>
                        <Badge variant="destructive">Needs Practice</Badge>
                      </li>
                    ))}
                  </ul>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4 text-center">
                  <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Class</p>
                  <p className="text-2xl font-bold text-white">{currentRoom.studentCount} Students</p>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>

    {/* ── Mobile-only dashboard (matches app lg breakpoint) ── */}
    <div className="lg:hidden min-h-screen bg-[#0e1627] p-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/classroom')} className="text-slate-300 hover:text-white" aria-label="All classrooms">
          <Menu size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-tight truncate">{currentRoom.name}</p>
          <p className="text-slate-400 text-xs uppercase tracking-wide truncate">
            {currentRoom.course} · {currentRoom.level}
          </p>
        </div>
        <NotificationBell />
        <button onClick={() => navigate('/classroom')} className="text-slate-300 text-sm font-semibold flex-shrink-0">
          Exit
        </button>
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initialsOf(displayName)}
        </div>
      </div>

      {/* Welcome banner */}
      <div className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-indigo-900 via-[#232a5e] to-violet-900 border border-white/10 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-300 text-sm">{greetingFor()},</p>
          <p className="text-white text-2xl font-bold">Welcome Back! 👋</p>
          <p className="text-slate-300 text-xs mt-1">Keep learning. A more secure tomorrow starts with you.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <GraduationCap className="w-12 h-12 text-violet-300/80" />
          <p className="text-slate-400 text-[10px] mt-1 leading-tight">Learn<br />Practice<br />Grow</p>
        </div>
      </div>

      {/* MY PROGRESS */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold tracking-wide text-sm">MY PROGRESS</h2>
        <button onClick={() => navigate(`/classroom/${roomId}/learn/progress`)} className="text-violet-400 text-xs font-semibold flex items-center">
          View Details <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { icon: BookOpen, value: String(topics.length), label: 'Total Topics', sub: 'Explore your course content', color: 'text-indigo-300', bg: 'bg-indigo-500/15' },
          { icon: CheckCircle, value: String(completedCount), label: 'Completed', sub: "Topics you've finished", color: 'text-green-400', bg: 'bg-green-500/15' },
          { icon: TrendingUp, value: String(inProgressCount), label: 'In Progress', sub: 'Keep going, you can do it!', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
          { icon: Award, value: `${totalProgress}%`, label: 'Overall Progress', sub: `${completedCount} of ${topics.length} done`, color: 'text-violet-300', bg: 'bg-violet-500/15', bar: true },
        ].map((c) => (
          <button key={c.label} onClick={() => navigate(`/classroom/${roomId}/learn/topics`)} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 text-left">
            <div className="flex items-center justify-between mb-1">
              <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-white text-xl font-bold">{c.value}</p>
            <p className="text-slate-300 text-xs font-semibold">{c.label}</p>
            <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{c.sub}</p>
            {c.bar && (
              <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${totalProgress}%` }} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* MY LEARNING */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold tracking-wide text-sm">MY LEARNING</h2>
        <button onClick={() => navigate(`/classroom/${roomId}/learn/topics`)} className="text-violet-400 text-xs font-semibold flex items-center">
          All Topics <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => navigate(`/classroom/${roomId}/learn/topics`)} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 text-left">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-300" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-white text-sm font-bold">Topics</p>
          <p className="text-slate-500 text-[11px] leading-tight">Explore and learn everything step by step</p>
        </button>
        <button onClick={() => navigate(assignmentsTarget)} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 text-left">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
              <FileText className="w-4 h-4 text-red-300" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-white text-sm font-bold">Assignments</p>
          <p className="text-slate-500 text-[11px] leading-tight">
            {assignments.length > 0 ? `${assignments.length} upcoming — ${assignments[0].title}` : 'No upcoming assessments. Enjoy the break!'}
          </p>
        </button>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500/15 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-white text-sm font-bold flex-1">AI Recommendations</p>
          <Button size="sm" onClick={() => navigate(currentTopic ? `/classroom/${roomId}/learn/topics/${currentTopic.id}` : `/classroom/${roomId}/learn/topics`)} className="bg-violet-600 hover:bg-violet-500 rounded-xl text-xs">
            Get Started <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <p className="text-slate-400 text-xs">
          {weakAreas.length > 0
            ? `Focus on “${weakAreas[0]}” and retake its knowledge checks for a smarter learning path.`
            : 'Start your first topic to get personalized tips and a smarter learning path.'}
        </p>
      </div>

      {/* Weak Areas */}
      <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-white text-sm font-bold flex-1">Weak Areas</p>
          {weakAreas.length === 0 && (
            <span className="text-[11px] font-semibold text-green-300 border border-green-500/40 rounded-full px-2 py-0.5">✓ You're on track!</span>
          )}
        </div>
        {weakAreas.length === 0 ? (
          <p className="text-slate-400 text-xs">No weak areas right now. Keep it up!</p>
        ) : (
          <div className="space-y-1.5 mt-1">
            {weakAreas.map((area) => (
              <div key={area} className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">{area}</span>
                <Badge variant="destructive">Needs Practice</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MY CLASS */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold tracking-wide text-sm">MY CLASS</h2>
        <button onClick={() => navigate(`/classroom/${roomId}/learn/announcements`)} className="text-violet-400 text-xs font-semibold flex items-center">
          View Class <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <button onClick={() => navigate(`/classroom/${roomId}/learn/announcements`)} className="w-full rounded-2xl bg-slate-800/80 border border-white/5 p-4 flex items-center gap-3 text-left mb-2">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="flex-1">
          <p className="text-slate-400 text-xs">Class</p>
          <p className="text-white font-bold">{currentRoom.studentCount} Students</p>
          <p className="text-slate-500 text-[11px]">Learn together. Achieve together.</p>
        </div>
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#0e1627] flex items-center justify-center text-[10px] font-bold text-white ${['bg-violet-500', 'bg-blue-500', 'bg-green-500'][i]}`}>
              {initialsOf(displayName).slice(0, 1)}
            </div>
          ))}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </button>

      <ClassroomMobileTabs tabs={mobileTabs} />
    </div>
    </>
  );
}
