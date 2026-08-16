import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../contexts/ClassroomContext';
import { topicService, TopicProgress } from '../services/topicService';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  FileText,
  Users,
  Award,
} from 'lucide-react';
import { Topic } from '../types/classroom';

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
  const [progressMap, setProgressMap] = useState<Map<string, TopicProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchTopics();
      fetchProgress();
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

  const assignments = [
    {
      id: '1',
      title: 'Hazard Identification Quiz',
      dueDate: new Date(Date.now() + 86400000 * 3),
      type: 'quiz',
      completed: false,
    },
    {
      id: '2',
      title: 'Risk Assessment Case Study',
      dueDate: new Date(Date.now() + 86400000 * 7),
      type: 'assignment',
      completed: false,
    },
  ];

  const weakAreas = ['PPE Standards', 'Risk Matrix'];

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

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
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
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{assignment.title}</p>
                          <p className="text-sm text-slate-400">
                            Due {new Date(assignment.dueDate).toLocaleDateString()}
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
                    <li>• Review PPE selection guidelines</li>
                    <li>• Practice risk matrix calculations</li>
                    <li>• Take the Hazard Identification quiz</li>
                  </ul>
                </div>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-red-400" />
                    <h3 className="font-medium text-white">Weak Areas</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {weakAreas.map((area) => (
                      <li key={area} className="flex items-center justify-between">
                        <span>{area}</span>
                        <Badge variant="destructive">Needs Practice</Badge>
                      </li>
                    ))}
                  </ul>
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
  );
}
