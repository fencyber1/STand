import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { announcementService } from '../../services/announcementService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from '../../components/ui/select';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Send,
  Clock,
  Loader2,
  Bell,
  Calendar,
  Send as SendIcon,
  X,
} from 'lucide-react';
import { Announcement } from '../../types/classroom';

export default function TeacherAnnouncementsScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'general' as Announcement['type'],
    scheduledAt: '',
    status: 'draft' as Announcement['status'],
  });

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      fetchAnnouncements();
    }
    const unsubscribe = subscribeToCurrentRoom();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [roomId, loadRoom]);

  const fetchAnnouncements = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await announcementService.getAnnouncementsByRoom(roomId);
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!roomId || !formData.title.trim() || !formData.body.trim()) return;
    setSaving(true);
    try {
      const announcementData = {
        roomId,
        teacherId: currentRoom?.ownerId || '',
        title: formData.title,
        body: formData.body,
        type: formData.type,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
        status: formData.status,
        recipientCount: 0,
        sentAt: formData.status === 'sent' ? new Date() : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, {
          ...announcementData,
          status: formData.status,
        });
      } else {
        await announcementService.createAnnouncement(announcementData as Omit<Announcement, 'id'>);
      }
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      resetForm();
      await fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(announcementId);
      await fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  const handleSend = async (announcementId: string) => {
    try {
      await announcementService.sendAnnouncement(announcementId);
      await fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to send announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      scheduledAt: announcement.scheduledAt
        ? new Date(announcement.scheduledAt).toISOString().slice(0, 16)
        : '',
      status: announcement.status,
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      type: 'general',
      scheduledAt: '',
      status: 'draft',
    });
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    resetForm();
    setShowCreateModal(true);
  };

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

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Announcement['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      case 'scheduled':
        return <Badge variant="secondary"><Calendar className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case 'sent':
        return <Badge variant="default"><SendIcon className="w-3 h-3 mr-1" /> Sent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const renderAnnouncementsSection = (title: string, items: Announcement[], emptyMessage: string) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {title} ({items.length})
        </h3>
        <div className="space-y-3">
          {items.map((announcement) => (
            <Card key={announcement.id} className="bg-slate-800 border-slate-700">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-white">{announcement.title}</h3>
                      {getStatusBadge(announcement.status)}
                      <Badge variant="outline" className="text-xs capitalize">{announcement.type}</Badge>
                    </div>
                    <p className="text-slate-300 line-clamp-2">{announcement.body}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {announcement.scheduledAt ? `Scheduled: ${formatDate(announcement.scheduledAt)}` : `Created: ${formatDate(announcement.createdAt)}`}
                    </Badge>
                    {announcement.sentAt && (
                      <Badge variant="outline" className="text-xs">
                        Sent: {formatDate(announcement.sentAt)}
                      </Badge>
                    )}
                    <div className="flex-1" />
                    {announcement.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(announcement)}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {announcement.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(announcement)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {announcement.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm('Send this announcement now?')) {
                            sendAnnouncement(announcement.id);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <SendIcon className="w-4 h-4 mr-1" />
                        Send Now
                      </Button>
                    )}
                    {announcement.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(announcement.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  const sendAnnouncement = async (announcementId: string) => {
    try {
      await announcementService.sendAnnouncement(announcementId);
      await fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to send announcement');
    }
  };

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

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setEditingAnnouncement(null); resetForm(); }}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Announcement title" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="body">Message *</Label>
            <Textarea id="body" value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} placeholder="Write your announcement..." rows={4} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as Announcement['type'] })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Announcement['status'] })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="scheduledAt">Schedule For (optional)</Label>
            <Input id="scheduledAt" type="datetime-local" value={formData.scheduledAt} onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} className="mt-1" />
            <p className="text-xs text-slate-400 mt-1">Only used when status is 'Scheduled'</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => { setShowCreateModal(false); setEditingAnnouncement(null); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.title.trim() || !formData.body.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Saving...' : (editingAnnouncement ? 'Update' : 'Create')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/dashboard`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
              <p className="text-slate-400">Announcements</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{announcements.filter(a => a.status === 'draft').length}</p>
            <p className="text-sm text-slate-400">Drafts</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{announcements.filter(a => a.status === 'scheduled').length}</p>
            <p className="text-sm text-slate-400">Scheduled</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center mx-auto mb-2">
              <SendIcon className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{announcements.filter(a => a.status === 'sent').length}</p>
            <p className="text-sm text-slate-400">Sent</p>
          </Card>
        </div>

        {renderAnnouncementsSection('Sent', announcements.filter(a => a.status === 'sent').sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()), 'No sent announcements yet.')}

        {renderAnnouncementsSection('Scheduled', announcements.filter(a => a.status === 'scheduled').sort((a, b) => new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime()), 'No scheduled announcements.')}

        {renderAnnouncementsSection('Drafts', announcements.filter(a => a.status === 'draft').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 'No draft announcements.')}

        {announcements.length === 0 && (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No announcements yet</h3>
            <p className="text-slate-400 mb-4">Create your first announcement to communicate with your class.</p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </Card>
        )}

        {showCreateModal && modalContent}
    </div>
    </div>
  );
}

function formatDate(date: Date | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}