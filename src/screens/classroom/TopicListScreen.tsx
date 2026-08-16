import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { topicService } from '../../services/topicService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { Topic, TopicStatus } from '../../types/classroom';

/**
 * Topic list screen for a classroom room.
 * Does not affect any existing components or flows.
 */
export default function TopicListScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, refreshRoom, subscribeToCurrentRoom } = useClassroom();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomId) {
      refreshRoom();
      fetchTopics();
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId]);

  const fetchTopics = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await topicService.getTopicsByRoom(roomId);
      setTopics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (topicId: string) => {
    try {
      await topicService.publishTopic(topicId);
      fetchTopics();
    } catch (err: any) {
      setError(err.message || 'Failed to publish topic');
    }
  };

  const handleArchive = async (topicId: string) => {
    try {
      await topicService.archiveTopic(topicId);
      fetchTopics();
    } catch (err: any) {
      setError(err.message || 'Failed to archive topic');
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      await topicService.deleteTopic(topicId, roomId);
      fetchTopics();
    } catch (err: any) {
      setError(err.message || 'Failed to delete topic');
    }
  };

  const getStatusColor = (status: TopicStatus) => {
    switch (status) {
      case 'published':
        return 'bg-green-600 text-white';
      case 'draft':
        return 'bg-yellow-600 text-white';
      case 'archived':
        return 'bg-slate-600 text-slate-300';
      default:
        return 'bg-slate-600 text-slate-300';
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
            <p className="text-slate-400">
              {currentRoom.course} · {currentRoom.level}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/classroom')}>
            Back to Classroom
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Topics</h2>
          <Button
            onClick={() => navigate(`/classroom/${roomId}/topics/add`)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Topic
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Topics List */}
        {topics.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No topics yet</h3>
            <p className="text-slate-400 mb-4">
              Add your first topic to start building your curriculum
            </p>
            <Button
              onClick={() => navigate(`/classroom/${roomId}/topics/add`)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Topic
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <Card
                key={topic.id}
                className="bg-slate-800 border-slate-700 hover:border-indigo-500 transition-all group"
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="cursor-move text-slate-500">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{topic.title}</h3>
                      <Badge className={getStatusColor(topic.status)}>
                        {topic.status}
                      </Badge>
                    </div>

                    {topic.description && (
                      <p className="text-sm text-slate-300 mb-2 line-clamp-2">
                        {topic.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Created {new Date(topic.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {topic.publishedAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Published {new Date(topic.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {topic.sourceFiles && topic.sourceFiles.length > 0 && (
                        <span>{topic.sourceFiles.length} file(s)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/classroom/${roomId}/topics/${topic.id}`)}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/classroom/${roomId}/topics/${topic.id}/edit`)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    {topic.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePublish(topic.id)}
                        title="Publish"
                        className="text-green-400 hover:text-green-300"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(topic.id)}
                      title="Delete"
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
