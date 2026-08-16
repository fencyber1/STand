import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useClassroom } from '../contexts/ClassroomContext';
import { classroomService } from '../services/classroomService';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
} from 'lucide-react';
import { RoomMember } from '../types/classroom';

export default function TeacherDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchMembers();
    }
    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

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

  const handleAddTopic = () => {
    navigate(`/classroom/${roomId}/topics/add`);
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
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

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
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
        <aside className="w-64 flex-shrink-0 border-r border-slate-700 p-4 h-full overflow-y-auto">
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
              to={`/classroom/${roomId}/settings`}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
            >
              <Settings className="w-4 h-4" />
              Class Settings
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto h-full">
          <div className="space-y-6">
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
                <Button onClick={handleAddTopic} className="bg-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Topic
                </Button>
                <Button
                  onClick={() => navigate(`/classroom/${roomId}/assessments/add`)}
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
        </main>
      </div>
    </div>
  );
}