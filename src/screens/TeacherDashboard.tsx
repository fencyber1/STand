import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Bell,
  Settings,
  Plus,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { RoomMember } from '../types/classroom';

/**
 * Teacher dashboard for a specific classroom room.
 * Does not affect any existing components or flows.
 */
export default function TeacherDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, refreshRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'topics' | 'assessments' | 'students' | 'grades' | 'analytics' | 'announcements' | 'settings'
  >('overview');

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

  const handleNav = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleAddTopic = () => {
    navigate(`/classroom/${roomId}/topics/add`);
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          Loading classroom...
        </div>
      </div>
    );
  }

return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
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
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-700 p-4 h-full overflow-y-auto">
          <nav className="space-y-1">
            <button
              onClick={() => handleNav('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => handleNav('topics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'topics'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Topics
              <Badge variant="secondary" className="ml-auto">
                {currentRoom.totalTopics}
              </Badge>
            </button>

            <button
              onClick={() => handleNav('assessments')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'assessments'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Assessments
            </button>

            <button
              onClick={() => handleNav('students')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              Students
              <Badge variant="secondary" className="ml-auto">
                {currentRoom.studentCount}
              </Badge>
            </button>

            <button
              onClick={() => handleNav('grades')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'grades'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Grades
            </button>

            <button
              onClick={() => handleNav('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>

            <button
              onClick={() => handleNav('announcements')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'announcements'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              Announcements
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Class Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto h-full">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Room Summary Cards */}
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

              {/* Quick Actions */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button onClick={handleAddTopic} className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Topic
                  </Button>
                  <Button
                    onClick={() => handleNav('assessments')}
                    className="bg-blue-600"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Create Assessment
                  </Button>
                  <Button
                    onClick={() => handleNav('announcements')}
                    className="bg-purple-600"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Announcement
                  </Button>
                  <Button
                    onClick={() => handleNav('analytics')}
                    className="bg-green-600"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Class Insights
                  </Button>
                </div>
              </div>

              {/* AI Insights Section */}
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

              {/* Student Progress Snapshot */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Student Progress Snapshot
                </h2>
                {loadingMembers ? (
                  <p className="text-slate-400">Loading students...</p>
                ) : (
                  <div className="space-y-2">
                    {members.slice(0, 5).map((member) => (
                      <Card key={member.id} className="bg-slate-800 border-slate-700">
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-600" />
                            <span className="text-white">{member.displayName || member.email}</span>
                          </div>
                          <Badge
                            variant={
                              (member.progress ?? 0) > 70
                                ? 'default'
                                : (member.progress ?? 0) > 40
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {member.progress ?? 0}%
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Students</h2>
              {loadingMembers ? (
                <p className="text-slate-400">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <Card key={member.id} className="bg-slate-800 border-slate-700">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                            {member.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={member.displayName || 'Student'}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {member.displayName || member.email}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {member.role.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              (member.progress ?? 0) > 70
                                ? 'default'
                                : (member.progress ?? 0) > 40
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {member.progress ?? 0}% progress
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'topics' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Topics</h2>
                <Button onClick={handleAddTopic} className="bg-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Topic
                </Button>
              </div>
              <p className="text-slate-400">
                {currentRoom.totalTopics} topics in this room ({currentRoom.topicsPublished} published)
              </p>
            </div>
          )}

          {activeTab !== 'overview' &&
            activeTab !== 'topics' &&
            activeTab !== 'students' && (
              <div className="text-center py-12 text-slate-400">
                <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon</p>
              </div>
            )}
        </main>
      </div>
    </div>
  );
}
