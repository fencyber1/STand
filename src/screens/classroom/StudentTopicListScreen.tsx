import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { topicService } from '../../services/topicService';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Topic, TopicStatus } from '../../types/classroom';

interface TopicProgress {
  topicId: string;
  progress: number;
  completed: boolean;
  lastSection?: string;
  timeSpent: number;
}

export default function StudentTopicListScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, TopicProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      setError(err.message || 'Failed to load topics');
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
    return progressMap.get(topicId) || { progress: 0, completed: false, timeSpent: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading topics...</div>
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

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => getProgress(t.id).completed).length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
            <p className="text-slate-400">
              {currentRoom.course} · {currentRoom.level}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Overall Progress</p>
              <p className="text-lg font-bold text-indigo-400">{overallProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {/* Progress Overview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">My Topics</h2>
            <Badge variant="secondary" className="text-sm">
              {completedTopics} / {totalTopics} Completed
            </Badge>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div
              className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-sm text-slate-400">
            {overallProgress}% of curriculum completed
          </p>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Topics List */}
        {topics.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No published topics yet</h3>
            <p className="text-slate-400 mb-4">
              Your teacher hasn't published any topics yet. Check back later!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => {
              const progress = getProgress(topic.id);
              const isCompleted = progress.completed;

              return (
                <Card
                  key={topic.id}
                  className={`bg-slate-800 border-slate-700 hover:border-indigo-500 transition-all group ${
                    isCompleted ? 'border-green-500/30' : ''
                  }`}
                  onClick={() => navigate(`/classroom/${roomId}/learn/topics/${topic.id}`)}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : index === completedTopics ? (
                        <ArrowRight className="w-6 h-6 text-indigo-400" />
                      ) : (
                        <Clock className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate">{topic.title}</h3>
                        <Badge variant={isCompleted ? 'default' : 'secondary'}>
                          {isCompleted ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>

                      {topic.description && (
                        <p className="text-sm text-slate-300 mb-2 line-clamp-2">
                          {topic.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{progress.progress}% complete</span>
                        </div>
                        {progress.timeSpent > 0 && (
                          <span>{Math.round(progress.timeSpent / 60)} min spent</span>
                        )}
                        {topic.publishedAt && (
                          <span>Published {new Date(topic.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="w-20 text-right">
                      <span className="text-sm font-medium text-white">
                        {progress.progress}%
                      </span>
                    </div>

                    <ArrowLeft className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="px-4 pb-4">
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}