import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useClassroom } from '../contexts/ClassroomContext';
import { useAuth } from '../contexts/AuthContext';
import { classroomService } from '../services/classroomService';
import { topicService } from '../services/topicService';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import NotificationBell from '../components/notifications/NotificationBell';
import {
  ClassroomMobileTabs,
  ClassroomMoreSheet,
  MoreTabIcon,
  greetingFor,
  initialsOf,
} from '../components/classroom/ClassroomMobileTabs';
import {
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  Plus,
  Calendar,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  Megaphone,
  Menu,
  GraduationCap,
  UserPlus,
  Send,
  FileText,
  ChevronRight,
  Home,
} from 'lucide-react';
import { RoomMember, Assessment, Topic } from '../types/classroom';

export function TeacherDashboardContent() {
  const { currentRoom } = useClassroom();
  const { user } = useAuth();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  const fetchMembers = async () => {
    if (!roomId) return;
    setLoadingMembers(true);
    try {
      const data = await classroomService.getRoomMembers(roomId);
      setMembers(data as RoomMember[]);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchRoomData = async () => {
    if (!roomId) return;
    try {
      const [a, t] = await Promise.all([
        classroomService.getAssessmentsByRoom(roomId),
        topicService.getTopicsByRoom(roomId),
      ]);
      setAssessments(a);
      setTopics(t);
    } catch (err) {
      console.error('Failed to fetch room data:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchRoomData();
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentRoom) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading classroom...</div>
      </div>
    );
  }

  const getProgressBadge = (progress: number) => {
    if (progress > 70) return 'default';
    if (progress > 40) return 'secondary';
    return 'destructive';
  };

  const renderStudentProgress = () => {
    if (loadingMembers) {
      return <p className="text-slate-400">Loading students...</p>;
    }
    return (
      <div className="space-y-2">
        {members.slice(0, 5).map((member) => {
          const progress = member.progress ?? 0;
          return (
            <Card key={member.id} className="bg-slate-800 border-slate-700">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-600" />
                  <span className="text-white">{member.displayName || member.email}</span>
                </div>
                <Badge variant={getProgressBadge(progress)}>
                  {progress}%
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const students = members.filter((m) => m.role === 'student');
  const firstName = (user?.fullName || 'Teacher').split(' ')[0];
  const upcoming = assessments.find((a) => a.status === 'live' || a.status === 'scheduled')
    || assessments[0];
  const recentActivity = [
    ...students
      .slice()
      .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
      .slice(0, 1)
      .map((s) => ({
        icon: Users,
        title: `${s.displayName || s.email} joined your class`,
        sub: 'Student enrolled',
        to: `/classroom/${roomId}/students`,
      })),
    ...topics.slice(0, 1).map((t) => ({
      icon: BookOpen,
      title: t.status === 'published' ? `"${t.title}" published` : `"${t.title}" drafted`,
      sub: 'Topic update',
      to: `/classroom/${roomId}/topics`,
    })),
    ...assessments.slice(0, 1).map((a) => ({
      icon: ClipboardList,
      title: `"${a.title}" (${a.status})`,
      sub: 'Assessment update',
      to: `/classroom/${roomId}/assessments`,
    })),
  ].slice(0, 3);

  const mobileTabs = [
    { label: 'Home', icon: Home, to: `/classroom/${roomId}/dashboard`, end: true },
    { label: 'Topics', icon: BookOpen, to: `/classroom/${roomId}/topics` },
    { label: 'Assessments', icon: ClipboardList, to: `/classroom/${roomId}/assessments` },
    { label: 'Students', icon: Users, to: `/classroom/${roomId}/students` },
    { label: 'More', icon: MoreTabIcon, onClick: () => setMoreOpen(true) },
  ];

  return (
    <>
    <div className="space-y-6 hidden lg:block">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <div className="p-4 text-center">
            <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{currentRoom.studentCount}</p>
            <p className="text-sm text-slate-400">Students</p>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <div className="p-4 text-center">
            <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{currentRoom.totalTopics}</p>
            <p className="text-sm text-slate-400">Topics</p>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <div className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {currentRoom.topicsPublished}/{currentRoom.totalTopics}
            </p>
            <p className="text-sm text-slate-400">Published</p>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <div className="p-4 text-center">
            <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">
              {currentRoom.upcomingAssessment || 'None scheduled'}
            </p>
            <p className="text-sm text-slate-400">Upcoming</p>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button onClick={() => navigate(`/classroom/${roomId}/topics/add`)} className="bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Topic
          </Button>
          <Button
            onClick={() => navigate(`/classroom/${roomId}/assessments`)}
            className="bg-blue-600"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
          <Button
            onClick={() => navigate(`/classroom/${roomId}/analytics`)}
            className="bg-green-600"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Class Insights
          </Button>
          <Button
            onClick={() => navigate(`/classroom/${roomId}/students`)}
            className="bg-purple-600"
          >
            <Users className="w-4 h-4 mr-2" />
            View Students
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">AI Classroom Insights</h2>
        <Card className="bg-slate-800 border-slate-700">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-200">
                  No specific insights available yet. Add topics and assessments to begin generating analytics.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Student Progress Snapshot
        </h2>
        {renderStudentProgress()}
      </div>
    </div>

    {/* ── Mobile-only dashboard (matches app lg breakpoint) ── */}
    <div className="lg:hidden p-4 pb-28 min-h-screen bg-[#0e1627]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setMoreOpen(true)} className="text-slate-300 hover:text-white" aria-label="Menu">
          <Menu size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-tight truncate">{currentRoom.name}</p>
          <p className="text-slate-400 text-xs uppercase tracking-wide truncate">
            {currentRoom.course} · {currentRoom.level}
          </p>
        </div>
        <NotificationBell />
        <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initialsOf(user?.fullName)}
        </div>
      </div>

      {/* Welcome banner */}
      <div className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-indigo-900 via-[#1b2350] to-violet-900 border border-white/10">
        <p className="text-white text-xl font-bold">Welcome back, {firstName}! 👋</p>
        <p className="text-slate-300 text-sm mt-1">Keep learning, keep building a safer tomorrow.</p>
        <Button onClick={() => navigate(`/classroom/${roomId}/topics/add`)} className="mt-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          Continue Learning <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: Users, value: String(currentRoom.studentCount ?? students.length), label: 'Students', color: 'text-violet-400' },
          { icon: BookOpen, value: String(currentRoom.totalTopics ?? topics.length), label: 'Topics', color: 'text-blue-400' },
          { icon: ClipboardList, value: String(assessments.length), label: 'Assessments', color: 'text-green-400' },
          { icon: Calendar, value: upcoming ? upcoming.title.split(' ').slice(0, 2).join(' ') : 'None', label: 'Upcoming', color: 'text-orange-400', small: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-white font-bold ${s.small ? 'text-xs' : 'text-lg'} leading-tight truncate`}>{s.value}</p>
            <p className="text-slate-400 text-[11px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold">Quick Actions</h2>
        <button onClick={() => navigate(`/classroom/${roomId}/analytics`)} className="text-violet-400 text-xs font-semibold">See All</button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: BookOpen, label: 'Create Topic', to: `/classroom/${roomId}/topics/add` },
          { icon: FileText, label: 'Create Assessment', to: `/classroom/${roomId}/assessments` },
          { icon: UserPlus, label: 'Add Student', to: `/classroom/${roomId}/students` },
          { icon: Send, label: 'Send Announcement', to: `/classroom/${roomId}/announcements` },
        ].map((a) => (
          <button key={a.label} onClick={() => navigate(a.to)} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 flex flex-col items-center gap-1.5">
            <a.icon className="w-6 h-6 text-indigo-300" />
            <span className="text-slate-200 text-[11px] font-medium leading-tight text-center">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold">Recent Activity</h2>
        <button onClick={() => navigate(`/classroom/${roomId}/students`)} className="text-violet-400 text-xs font-semibold">See All</button>
      </div>
      <div className="space-y-2 mb-5">
        {recentActivity.length === 0 && (
          <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-4 text-slate-400 text-sm">
            No activity yet — add a topic or invite students to get started.
          </div>
        )}
        {recentActivity.map((item) => (
          <button key={item.title} onClick={() => navigate(item.to)} className="w-full rounded-2xl bg-slate-800/80 border border-white/5 p-3 flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{item.title}</p>
              <p className="text-slate-400 text-xs">{item.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Tools & Resources */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold">Tools &amp; Resources</h2>
        <button onClick={() => setMoreOpen(true)} className="text-violet-400 text-xs font-semibold">See All</button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: BookOpen, label: 'Topics Library', to: `/classroom/${roomId}/topics` },
          { icon: FileText, label: 'Practice Exercises', to: `/classroom/${roomId}/assessments` },
          { icon: BarChart3, label: 'Analytics & Reports', to: `/classroom/${roomId}/analytics` },
          { icon: Settings, label: 'Class Settings', to: `/classroom/${roomId}/settings` },
        ].map((t) => (
          <button key={t.label} onClick={() => navigate(t.to)} className="rounded-2xl bg-slate-800/80 border border-white/5 p-3 flex flex-col items-center gap-1.5">
            <t.icon className="w-6 h-6 text-indigo-300" />
            <span className="text-slate-200 text-[11px] font-medium leading-tight text-center">{t.label}</span>
          </button>
        ))}
      </div>

      <ClassroomMobileTabs tabs={mobileTabs} />
      <ClassroomMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={[
          { label: 'Analytics & Reports', icon: BarChart3, to: `/classroom/${roomId}/analytics` },
          { label: 'Attendance', icon: CalendarCheck, to: `/classroom/${roomId}/attendance` },
          { label: 'Announcements', icon: Megaphone, to: `/classroom/${roomId}/announcements` },
          { label: 'Class Settings', icon: Settings, to: `/classroom/${roomId}/settings` },
          { label: 'Exit Classroom', icon: Home, to: '/classroom' },
        ]}
      />
    </div>
    </>
  );
}

export default function TeacherDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const navigate = useNavigate();

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="hidden lg:block border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
            <p className="text-slate-400">
              {currentRoom.course} &middot; {currentRoom.level}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/classroom')}>
            Exit
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-slate-700 p-4 h-full overflow-y-auto">
          <nav className="space-y-1">
            <NavLink
              to={`/classroom/${roomId}/dashboard`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/topics`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <BookOpen className="w-4 h-4" />
              Topics
              <Badge variant="secondary" className="ml-auto">
                {currentRoom.totalTopics}
              </Badge>
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/assessments`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <ClipboardList className="w-4 h-4" />
              Assessments
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/students`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <Users className="w-4 h-4" />
              Students
              <Badge variant="secondary" className="ml-auto">
                {currentRoom.studentCount}
              </Badge>
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/analytics`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/attendance`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <CalendarCheck className="w-4 h-4" />
              Attendance
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/announcements`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <Megaphone className="w-4 h-4" />
              Announcements
            </NavLink>

            <NavLink
              to={`/classroom/${roomId}/settings`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <Settings className="w-4 h-4" />
              Class Settings
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 p-0 lg:p-6 overflow-y-auto h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}