import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { announcementService } from '../../services/announcementService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { Announcement } from '../../types/classroom';

export default function StudentAnnouncementsScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchAnnouncements();
      loadReadStatus();
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  const fetchAnnouncements = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await announcementService.getRecentAnnouncementsForStudent(roomId, 50);
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const loadReadStatus = async () => {
    try {
      const stored = localStorage.getItem(`read_announcements_${roomId}`);
      if (stored) {
        setReadAnnouncements(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load read status:', err);
    }
  };

  const markAsRead = (announcementId: string) => {
    setReadAnnouncements((prev) => {
      const next = new Set(prev);
      next.add(announcementId);
      localStorage.setItem(`read_announcements_${roomId}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'assessment':
        return <FileText className="w-4 h-4" />;
      case 'assignment':
        return <FileText className="w-4 h-4" />;
      case 'physical':
        return <Calendar className="w-4 h-4" />;
      case 'revision':
        return <Clock className="w-4 h-4" />;
      case 'general':
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: Announcement['type']) => {
    switch (type) {
      case 'assessment':
        return 'text-red-400 bg-red-600/20';
      case 'assignment':
        return 'text-blue-400 bg-blue-600/20';
      case 'physical':
        return 'text-green-400 bg-green-600/20';
      case 'revision':
        return 'text-purple-400 bg-purple-600/20';
      case 'general':
      default:
        return 'text-yellow-400 bg-yellow-600/20';
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const isRead = readAnnouncements.has(a.id);
    if (filter === 'unread') return !isRead;
    if (filter === 'read') return isRead;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading announcements...</div>
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/learn`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
              <p className="text-slate-400">Announcements</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-indigo-600 text-white' : ''}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Announcements List */}
        {filteredAnnouncements.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {filter === 'unread' ? 'No unread announcements' : filter === 'read' ? 'No read announcements' : 'No announcements yet'}
            </h3>
            <p className="text-slate-400">
              {filter === 'unread' ? 'All caught up!' : 'Check back later for new announcements.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const isRead = readAnnouncements.has(announcement.id);
              return (
                <Card
                  key={announcement.id}
                  className={`bg-slate-800 border-slate-700 transition-all ${
                    isRead ? 'border-slate-700' : 'border-indigo-500/30 bg-indigo-600/10'
                  }`}
                  onClick={() => markAsRead(announcement.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(announcement.type)}`}>
                          {getTypeIcon(announcement.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-bold text-white ${isRead ? '' : 'font-bold'}`}>{announcement.title}</h3>
                            <Badge variant="outline" className={`text-xs ${getTypeColor(announcement.type).replace('text-', 'border-').replace('bg-', 'bg-')}`}>
                              {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">{formatDate(announcement.sentAt || announcement.createdAt)}</p>
                        </div>
                      </div>
                      {!isRead && (
                        <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed">{announcement.body}</p>
                    {announcement.scheduledAt && (
                      <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>Scheduled for: {formatDate(announcement.scheduledAt)}</span>
                      </div>
                    )}
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

function formatDate(date: Date | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeColor(type: string) {
  switch (type) {
    case 'assessment':
      return 'text-red-400 border-red-500 bg-red-600/20';
    case 'assignment':
      return 'text-blue-400 border-blue-500 bg-blue-600/20';
    case 'physical':
      return 'text-green-400 border-green-500 bg-green-600/20';
    case 'revision':
      return 'text-purple-400 border-purple-500 bg-purple-600/20';
    case 'general':
    default:
      return 'text-yellow-400 border-yellow-500 bg-yellow-600/20';
  }
}