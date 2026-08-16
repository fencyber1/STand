import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';
import { Assessment } from '../../types/classroom';

/**
 * Assessments list screen for a classroom.
 * Shows all assessments, allows creating new ones, editing, and viewing results.
 * Does not affect any existing components or flows.
 */
export default function AssessmentsListScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
  const [newAssessmentDesc, setNewAssessmentDesc] = useState('');

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
    if (currentRoom?.id) {
      fetchAssessments();
    }
  }, [currentRoom, roomId]);

  const fetchAssessments = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await classroomService.getAssessmentsByRoom(roomId);
      setAssessments(data as Assessment[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!roomId || !newAssessmentTitle.trim()) return;

    setLoading(true);
    try {
      const newAssessment: Omit<Assessment, 'id'> = {
        roomId,
        topicId: '',
        title: newAssessmentTitle,
        description: newAssessmentDesc || undefined,
        scheduledAt: new Date(),
        durationMinutes: 60,
        questionCount: 0,
        totalMarks: 0,
        passingScore: 50,
        maxAttempts: 1,
        mode: 'same-questions',
        status: 'draft',
        questions: [],
        createdBy: currentRoom?.ownerId || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await classroomService.createAssessment(newAssessment);
      setShowCreateModal(false);
      setNewAssessmentTitle('');
      setNewAssessmentDesc('');
      fetchAssessments();
    } catch (err: any) {
      setError(err.message || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assessmentId: string) => {
    if (!roomId) return;
    try {
      await classroomService.deleteAssessment(assessmentId);
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete assessment');
    }
  };

  const getStatusColor = (status: Assessment['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-600 text-white';
      case 'scheduled':
        return 'bg-blue-600 text-white';
      case 'live':
        return 'bg-green-600 text-white';
      case 'closed':
        return 'bg-slate-600 text-slate-300';
      case 'graded':
        return 'bg-purple-600 text-white';
      case 'released':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-600 text-slate-300';
    }
  };

  if (!currentRoom) {
    return (
      <div className="text-center text-slate-400 py-12">
        Loading classroom...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Assessments</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {assessments.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 p-8 text-center">
          <ClipboardList className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No assessments yet</h3>
          <p className="text-slate-400 mb-4">
            Create your first assessment to evaluate your students.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card key={assessment.id} className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{assessment.title}</h3>
                    <Badge className={getStatusColor(assessment.status)}>
                      {assessment.status}
                    </Badge>
                  </div>
                  {assessment.description && (
                    <p className="text-sm text-slate-300 mb-2">{assessment.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Scheduled: {new Date(assessment.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{assessment.durationMinutes} min</span>
                    </div>
                    <span>{assessment.questionCount} questions</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/classroom/${roomId}/assessments/${assessment.id}`)}
                    title="View / Take"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/classroom/${roomId}/assessments/${assessment.id}/edit`)}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(assessment.id)}
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

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Create New Assessment</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="assessmentTitle">Title *</Label>
                <Input
                  id="assessmentTitle"
                  value={newAssessmentTitle}
                  onChange={(e) => setNewAssessmentTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="assessmentDesc">Description</Label>
                <Textarea
                  id="assessmentDesc"
                  value={newAssessmentDesc}
                  onChange={(e) => setNewAssessmentDesc(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAssessmentTitle('');
                  setNewAssessmentDesc('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateAssessment}
                disabled={!newAssessmentTitle.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
