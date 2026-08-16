import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { topicService, TopicProgress } from '../../services/topicService';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  BookOpen,
  CheckCircle,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

export default function StudentProgressScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [topics, setTopics] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, TopicProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchData();
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  const fetchData = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [topicData, progressData] = await Promise.all([
        topicService.getTopicsByRoom(roomId),
        topicService.getStudentProgress(roomId),
      ]);

      const publishedTopics = topicData.filter((t: any) => t.status === 'published');
      setTopics(publishedTopics);

      const map = new Map<string, TopicProgress>();
      progressData.forEach((p: TopicProgress) => map.set(p.topicId, p));
      setProgressMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (topicId: string) => {
    return progressMap.get(topicId) || { progress: 0, completed: false, timeSpent: 0, lastSection: undefined };
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => getProgress(t.id).completed).length;
  const inProgressTopics = topics.filter(t => {
    const p = getProgress(t.id);
    return p.progress > 0 && !p.completed;
  }).length;
  const notStartedTopics = totalTopics - completedTopics - inProgressTopics;
  const totalTimeSpent = topics.reduce((acc, t) => acc + getProgress(t.id).timeSpent, 0);
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading progress...</div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/classroom/${roomId}/learn`)}
            className="text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
            <p className="text-slate-400">Learning Progress</p>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {/* Overall Progress */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Overall Progress</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalTopics}</p>
              <p className="text-sm text-slate-400">Total Topics</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-600/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{completedTopics}</p>
              <p className="text-sm text-slate-400">Completed</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-600/20 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{inProgressTopics}</p>
              <p className="text-sm text-slate-400">In Progress</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{Math.round(totalTimeSpent / 60)}</p>
              <p className="text-sm text-slate-400">Hours Spent</p>
            </Card>
          </div>

          {/* Overall Progress Bar */}
          <div className="bg-slate-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-indigo-500 to-green-500 h-4 rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>0%</span>
            <span className="font-semibold text-white">{overallProgress}%</span>
            <span>100%</span>
          </div>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Topic Details */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Topic Progress</h2>

          {topics.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No published topics yet</h3>
              <p className="text-slate-400">
                Your teacher hasn't published any topics yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => {
                const progress = getProgress(topic.id);
                const isCompleted = progress.completed;
                const progressPercent = progress.progress;

                return (
                  <Card
                    key={topic.id}
                    className={`bg-slate-800 border-slate-700 ${
                      isCompleted ? 'border-green-500/30' : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isCompleted ? 'bg-green-600/20' : progressPercent > 0 ? 'bg-indigo-600/20' : 'bg-slate-700'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : progressPercent > 0 ? (
                              <TrendingUp className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{topic.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={isCompleted ? 'default' : progressPercent > 0 ? 'secondary' : 'outline'}>
                                {isCompleted ? 'Completed' : progressPercent > 0 ? 'In Progress' : 'Not Started'}
                              </Badge>
                              <span className="text-sm text-slate-400">{progressPercent}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">
                            {Math.round(progress.timeSpent / 60)} min
                          </p>
                          {progress.lastSection && (
                            <p className="text-xs text-slate-500">Last: {progress.lastSection}</p>
                          )}
                        </div>
                      </div>

                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Achievements/Stats */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Study Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{completedTopics}</p>
                  <p className="text-sm text-slate-400">Topics Mastered</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{Math.round(totalTimeSpent / 60)}h</p>
                  <p className="text-sm text-slate-400">Time Learning</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{overallProgress}%</p>
                  <p className="text-sm text-slate-400">Completion Rate</p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}