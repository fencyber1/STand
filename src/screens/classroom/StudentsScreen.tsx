import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Users,
  Trash2,
  UserPlus,
  Copy,
  Check,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { RoomMember, ClassroomUserRole } from '../../types/classroom';

export default function StudentsScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchMembers = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await classroomService.getRoomMembers(roomId);
      setMembers(data as RoomMember[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRemoveStudent = async (memberId: string) => {
    if (!roomId) return;
    try {
      await classroomService.removeRoomMember(roomId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove student');
    }
  };

  const handleCopyCode = async () => {
    if (currentRoom?.roomCode) {
      try {
        await navigator.clipboard.writeText(currentRoom.roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  const getRoleIcon = (role: ClassroomUserRole) => {
    switch (role) {
      case 'teacher':
      case 'admin':
        return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'assistant_teacher':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      default:
        return <Users className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: ClassroomUserRole) => {
    switch (role) {
      case 'teacher':
        return 'Teacher';
      case 'assistant_teacher':
        return 'Assistant';
      case 'admin':
        return 'Admin';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  if (!currentRoom) {
    return (
      <div className="text-center text-slate-400 py-12">
        Loading students...
      </div>
    );
  }

  const students = members.filter((m) => m.role === 'student');
  const staff = members.filter((m) => m.role !== 'student');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <Badge variant="secondary" className="text-sm">
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </Badge>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Invite Section */}
      <Card className="bg-slate-800 border-slate-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Students
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label htmlFor="inviteCode" className="text-xs text-slate-400">Class Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="inviteCode"
                value={inviteCode || currentRoom.roomCode}
                readOnly
                className="font-mono text-center bg-slate-900/50 border-slate-600 text-white"
                onClick={() => setInviteCode(currentRoom.roomCode)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Share this code with students so they can join your classroom.
        </p>
      </Card>

      {/* Students List */}
      {students.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 p-8 text-center">
          <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No students yet</h3>
          <p className="text-slate-400 text-sm">
            Share the class code to invite students to join.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <Card
              key={student.id}
              className="bg-slate-800 border-slate-700 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  {student.photoURL ? (
                    <img
                      src={student.photoURL}
                      alt={student.displayName || 'Student'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {student.displayName || student.email}
                    </span>
                    {getRoleIcon(student.role)}
                  </div>
                  <p className="text-sm text-slate-400">{student.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Joined {new Date(student.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                {student.progress !== undefined && (
                  <div>
                    <p className="text-sm text-slate-300">{student.progress}%</p>
                    <p className="text-xs text-slate-500">Progress</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveStudent(student.id)}
                  className="text-red-400 hover:text-red-300"
                  title="Remove student"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Staff Members */}
      {staff.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-white mb-3">Staff</h3>
          <div className="space-y-2">
            {staff.map((member) => (
              <Card key={member.id} className="bg-slate-800 border-slate-700 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName || 'Staff'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <Shield className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-white">
                    {member.displayName || member.email}
                  </span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
