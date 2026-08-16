import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { attendanceService } from '../../services/attendanceService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Shield,
  Loader2,
} from 'lucide-react';
import { Attendance, AttendanceType } from '../../types/classroom';

export default function StudentAttendanceScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [todayAttendance, setTodayAttendance] = useState<Record<AttendanceType, Attendance | null>>({
    physical: null,
    online: null,
    lesson: null,
    assessment: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AttendanceType>('physical');

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
      loadTodayAttendance();
    }

    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, loadRoom]);

  const loadTodayAttendance = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) throw new Error('Not authenticated');

      const today = new Date();
      const records = await attendanceService.getStudentAttendance(roomId, user.uid);

      const todayRecords: Record<AttendanceType, Attendance | null> = {
        physical: null,
        online: null,
        lesson: null,
        assessment: null,
      };

      const todayStr = new Date().toISOString().split('T')[0];
      records.forEach((r) => {
        const recordDate = new Date(r.date).toISOString().split('T')[0];
        if (recordDate === todayStr) {
          todayRecords[r.type] = r;
        }
      });

      setTodayAttendance(todayRecords);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (type: AttendanceType) => {
    if (!roomId) return;
    setCheckingIn(type);
    setError('');

    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) throw new Error('Not authenticated');

      await attendanceService.checkIn({
        roomId,
        studentId: user.uid,
        date: new Date(),
        type,
        status: 'present',
      });

      await loadTodayAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to check in');
    } finally {
      setCheckingIn(null);
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

  const typeLabels: Record<AttendanceType, { label: string; icon: typeof Calendar }> = {
    physical: { label: 'Physical Class', icon: Calendar },
    online: { label: 'Online Session', icon: Calendar },
    lesson: { label: 'Lesson', icon: Calendar },
    assessment: { label: 'Assessment', icon: Calendar },
  };

  if (loading) {
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

  const typeOrder: AttendanceType[] = ['physical', 'online', 'lesson', 'assessment'];

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
              <p className="text-slate-400">Attendance · {formatDate(new Date().toISOString())}</p>
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

        {/* Today's Sessions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Sessions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {typeOrder.map((type) => {
              const attendance = todayAttendance[type];
              const isCheckedIn = !!attendance;
              const TypeInfo = typeLabels[type];

              return (
                <Card
                  key={type}
                  className={`bg-slate-800 border-slate-700 hover:border-indigo-500 transition-all ${
                    isCheckedIn ? 'border-green-500/30' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isCheckedIn ? 'bg-green-600/20' : 'bg-slate-700'
                        }`}>
                          <TypeInfo.icon className={`w-6 h-6 ${isCheckedIn ? 'text-green-400' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{TypeInfo.label}</h3>
                          <p className="text-sm text-slate-400">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
                        </div>
                      </div>
                      <Badge variant={isCheckedIn ? 'default' : 'secondary'}>
                        {isCheckedIn ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Checked In
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Not Checked In
                          </>
                        )}
                      </Badge>
                    </div>

                    {attendance && (
                      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock className="w-4 h-4" />
                          <span>Checked in at {new Date(attendance.date).toLocaleTimeString()}</span>
                        </div>
                        {attendance.verifiedBy && (
                          <p className="text-xs text-slate-500 mt-1">Verified by teacher</p>
                        )}
                      </div>
                    )}

                    {!isCheckedIn && (
                      <Button
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleCheckIn(type)}
                        disabled={!!checkingIn}
                      >
                        {checkingIn === type ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Checking In...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Check In
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Attendance History */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance History
          </h2>

          <Card className="bg-slate-800 border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-medium text-white">Recent Attendance Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 font-medium text-slate-300">Date</th>
                    <th className="text-left p-4 font-medium text-slate-300">Type</th>
                    <th className="text-left p-4 font-medium text-slate-300">Status</th>
                    <th className="text-left p-4 font-medium text-slate-300">Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={4}>No recent attendance records</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}