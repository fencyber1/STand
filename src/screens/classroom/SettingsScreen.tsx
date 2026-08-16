import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Settings,
  Save,
  Trash2,
  AlertCircle,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { Room, RoomType } from '../../types/classroom';

/**
 * Settings screen for a classroom.
 * Allows editing room details, configuring settings, and archiving.
 * Does not affect any existing components or flows.
 */
export default function ClassroomSettingsScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    course: '',
    level: '',
    description: '',
    institution: '',
    department: '',
    startDate: '',
    endDate: '',
    roomType: 'physical_digital' as RoomType,
  });

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  useEffect(() => {
    if (currentRoom) {
      setFormData({
        name: currentRoom.name || '',
        course: currentRoom.course || '',
        level: currentRoom.level || '',
        description: currentRoom.description || '',
        institution: currentRoom.institution || '',
        department: currentRoom.department || '',
        startDate: currentRoom.startDate
          ? new Date(currentRoom.startDate).toISOString().split('T')[0]
          : '',
        endDate: currentRoom.endDate
          ? new Date(currentRoom.endDate).toISOString().split('T')[0]
          : '',
        roomType: currentRoom.roomType || 'physical_digital',
      });
    }
  }, [currentRoom]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!roomId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await classroomService.updateRoom(roomId, {
        name: formData.name,
        course: formData.course,
        level: formData.level,
        description: formData.description || undefined,
        institution: formData.institution || undefined,
        department: formData.department || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        roomType: formData.roomType,
        updatedAt: new Date(),
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!roomId) return;

    setLoading(true);
    try {
      await classroomService.archiveRoom(roomId);
      navigate('/classroom');
    } catch (err: any) {
      setError(err.message || 'Failed to archive room');
    } finally {
      setLoading(false);
      setShowArchiveConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-slate-400">
              {currentRoom.name} · {currentRoom.course}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/dashboard`)}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Room Settings
            </h2>
            <Badge variant="secondary">
              Room Code: {currentRoom.roomCode}
            </Badge>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-800 text-green-300 p-3 rounded-md mb-4">
              {success}
            </div>
          )}

          {/* Room Info */}
          <Card className="bg-slate-800 border-slate-700 p-6 mb-6">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Room Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="course">Course/Subject *</Label>
                <Input
                  id="course"
                  value={formData.course}
                  onChange={(e) => handleInputChange('course', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="level">Level/Class *</Label>
                <Input
                  id="level"
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={formData.institution}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={saving}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Room Type */}
          <Card className="bg-slate-800 border-slate-700 p-6 mb-6">
            <h3 className="font-medium text-white mb-4">Room Type</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="physical_digital"
                  checked={formData.roomType === 'physical_digital'}
                  onChange={() => handleInputChange('roomType', 'physical_digital')}
                  disabled={saving}
                  className="text-indigo-500"
                />
                <span className="text-slate-300">Physical + Digital Classroom</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="fully_online"
                  checked={formData.roomType === 'fully_online'}
                  onChange={() => handleInputChange('roomType', 'fully_online')}
                  disabled={saving}
                  />
                <span className="text-slate-300">Fully Online Classroom</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="hybrid"
                  checked={formData.roomType === 'hybrid'}
                  onChange={() => handleInputChange('roomType', 'hybrid')}
                  disabled={saving}
                />
                <span className="text-slate-300">Hybrid Classroom</span>
              </label>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-slate-800 border-slate-700 border-red-900/50 p-6 mb-6">
            <h3 className="font-medium text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Danger Zone
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Archiving this room will make it inaccessible to students.
              Existing data will be preserved but hidden.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowArchiveConfirm(true)}
            >
              Archive Room
            </Button>
          </Card>

          {/* Archive Confirmation */}
          {showArchiveConfirm && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-3">Archive Room?</h3>
                <p className="text-slate-300 text-sm mb-4">
                  This action cannot be undone. Are you sure you want to archive
                  "{currentRoom.name}"?
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowArchiveConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleArchive}
                  >
                    Archive Room
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
