import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { attendanceService } from '../../services/attendanceService';
import { classroomService } from '../../services/classroomService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Attendance, AttendanceType, RoomMember, ClassroomUserRole } from '../../types/classroom';

export default function TeacherAttendanceScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<AttendanceType>('physical');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);

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
    try {
      const data = await classroomService.getRoomMembers(roomId);
      const students = (data as RoomMember[]).filter((m) => m.role === 'student');
      setMembers(students);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const loadAttendance = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const records = await attendanceService.getAttendanceByRoomAndDate(
        roomId,
        new Date(selectedDate),
        selectedType
      );
      const recordMap: Record<string, any> = {};
      records.forEach((r) => {
        recordMap[r.studentId] = r;
      });
      setAttendanceRecords(recordMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [roomId, selectedDate, selectedType]);

  const handleMarkAttendance = async (studentId: string, status: Attendance['status']) => {
    if (!roomId) return;
    setSaving(true);
    try {
      await attendanceService.markAttendance(
        roomId,
        studentId,
        new Date(selectedDate),
        selectedType,
        status,
        currentRoom?.ownerId || ''
      );
      await loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkMark = async (status: Attendance['status']) => {
    if (!roomId) return;
    setSaving(true);
    try {
      const date = new Date(selectedDate);
      const records = members.map((m) => ({
        roomId: roomId!,
        studentId: m.id,
        date: new Date(selectedDate),
        type: selectedType,
        status: status as Attendance['status'],
        verifiedBy: currentRoom?.ownerId || '',
        createdAt: new Date(),
      }));
      await attendanceService.bulkCreateAttendance(records);
      await loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to bulk mark attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: Attendance['status']) => {
    switch (status) {
      case 'present':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Absent</Badge>;
      case 'late':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Late</Badge>;
      case 'excused':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" /> Excused</Badge>;
      default:
        return <Badge variant="outline">Unmarked</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const studentsWithAttendance = members.map((m) => ({
    ...m,
    attendance: attendanceRecords[m.id],
  }));

  if (loading && members.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading attendance...</div>
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

  const presentCount = members.filter((m) => attendanceRecords[m.id]?.status === 'present').length;
  const absentCount = members.filter((m) => attendanceRecords[m.id]?.status === 'absent').length;
  const lateCount = members.filter((m) => attendanceRecords[m.id]?.status === 'late').length;
  const excusedCount = members.filter((m) => attendanceRecords[m.id]?.status === 'excused').length;
  const unmarkedCount = members.filter((m) => !attendanceRecords[m.id]).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/classroom/${roomId}/dashboard`)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{currentRoom.name}</h1>
              <p className="text-slate-400">Attendance · {formatDate(selectedDate)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex-1 overflow-y-auto w-full">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Date & Type Selectors */}
        <Card className="bg-slate-800 border-slate-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-slate-300">Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48 bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-slate-300">Type:</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AttendanceType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="ml-auto"
            >
              Today
            </Button>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{presentCount}</p>
            <p className="text-sm text-slate-400">Present</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">{absentCount}</p>
            <p className="text-sm text-slate-400">Absent</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{lateCount}</p>
            <p className="text-sm text-slate-400">Late</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{excusedCount}</p>
            <p className="text-sm text-slate-400">Excused</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-600/20 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-white">{unmarkedCount}</p>
            <p className="text-sm text-slate-400">Unmarked</p>
          </Card>
        </div>

        {/* Bulk Actions */}
        <Card className="bg-slate-800 border-slate-700 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-medium text-white">Bulk Actions</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleBulkMark('present')}
                disabled={saving}
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Present
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkMark('absent')}
                disabled={saving}
                className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Mark All Absent
              </Button>
            </div>
          </div>
        </Card>

        {/* Attendance List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Students</h2>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showAllStudents}
                onChange={(e) => setShowAllStudents(e.target.checked)}
                className="rounded border-slate-600 text-indigo-500"
              />
              Show all students
            </label>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {studentsWithAttendance
              .filter((s) => showAllStudents || s.attendance)
              .map((student) => {
                const attendance = student.attendance;
                return (
                  <Card
                    key={student.id}
                    className={`bg-slate-800 border-slate-700 flex items-center justify-between ${
                      attendance?.status === 'present' ? 'border-green-500/30' :
                      attendance?.status === 'absent' ? 'border-red-500/30' :
                      attendance?.status === 'late' ? 'border-yellow-500/30' :
                      attendance?.status === 'excused' ? 'border-blue-500/30' :
                      'border-slate-700'
                    }`}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt={student.displayName || 'Student'} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{student.displayName || student.email}</p>
                        <p className="text-sm text-slate-400">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendance ? getStatusBadge(attendance.status) : <Badge variant="outline">Unmarked</Badge>}
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={attendance?.status === 'present' ? 'default' : 'outline'}
                          onClick={() => handleMarkAttendance(student.id, 'present')}
                          disabled={saving}
                          className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.status === 'absent' ? 'default' : 'outline'}
                          onClick={() => handleMarkAttendance(student.id, 'absent')}
                          disabled={saving}
                          className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.status === 'late' ? 'default' : 'outline'}
                          onClick={() => handleMarkAttendance(student.id, 'late')}
                          disabled={saving}
                          className="bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.status === 'excused' ? 'default' : 'outline'}
                          onClick={() => handleMarkAttendance(student.id, 'excused')}
                          disabled={saving}
                          className="bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30"
                        >
                          Excused
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            {members.length === 0 && (
              <Card className="bg-slate-800 border-slate-700 p-8 text-center">
                <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No students yet</h3>
                <p className="text-slate-400">Add students to your classroom to mark attendance.</p>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}