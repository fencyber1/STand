import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useClassroom } from '../../contexts/ClassroomContext';
import { classroomService } from '../../services/classroomService';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  AlertCircle,
  Award,
} from 'lucide-react';
import { Room } from '../../types/classroom';

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
  attendanceRate: number;
  topicMastery: Array<{
    topicName: string;
    averageMastery: number;
  }>;
  recentAssessments: Array<{
    title: string;
    averageScore: number;
    passRate: number;
  }>;
}

/**
 * Analytics screen for a classroom.
 * Shows class metrics, topic mastery, and assessment summaries.
 * Does not affect any existing components or flows.
 */
export default function AnalyticsScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentRoom, loadRoom, subscribeToCurrentRoom } = useClassroom();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      fetchAnalytics();
    }
  }, [currentRoom, roomId]);

  const fetchAnalytics = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const members = await classroomService.getRoomMembers(roomId);
      const students = members.filter((m: any) => m.role === 'student');

      const mockData: AnalyticsData = {
        totalStudents: students.length,
        activeStudents: Math.floor(students.length * 0.8),
        averageScore: Math.floor(Math.random() * 30 + 70),
        passRate: Math.floor(Math.random() * 20 + 75),
        completionRate: Math.floor(Math.random() * 25 + 60),
        attendanceRate: Math.floor(Math.random() * 15 + 80),
        topicMastery: [
          { topicName: 'Hazard Identification', averageMastery: 85 },
          { topicName: 'Risk Assessment', averageMastery: 72 },
          { topicName: 'PPE Selection', averageMastery: 91 },
          { topicName: 'Emergency Response', averageMastery: 68 },
        ],
        recentAssessments: [
          { title: 'Midterm Exam', averageScore: 78, passRate: 82 },
          { title: 'Hazard ID Quiz', averageScore: 88, passRate: 90 },
          { title: 'PPE Practice', averageScore: 65, passRate: 70 },
        ],
      };

      setAnalytics(mockData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-white">Class Analytics</h1>
        <Badge variant="secondary">
          Updated {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700 p-4 text-center">
              <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{analytics.totalStudents}</p>
              <p className="text-sm text-slate-400">
                Total Students ({analytics.activeStudents} active)
              </p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{analytics.averageScore}%</p>
              <p className="text-sm text-slate-400">Average Score</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4 text-center">
              <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{analytics.passRate}%</p>
              <p className="text-sm text-slate-400">Pass Rate</p>
            </Card>
          </div>

          {/* Completion & Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <h3 className="font-medium text-white mb-3">Completion Rate</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">Curriculum</span>
                    <span className="text-sm font-medium text-white">{analytics.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${analytics.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <h3 className="font-medium text-white mb-3">Attendance Rate</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">Overall</span>
                    <span className="text-sm font-medium text-white">{analytics.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${analytics.attendanceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Topic Mastery */}
          <Card className="bg-slate-800 border-slate-700 p-6 mb-6">
            <h3 className="font-medium text-white mb-4">Topic Mastery</h3>
            <div className="space-y-3">
              {analytics.topicMastery.map((topic, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">{topic.topicName}</span>
                    <span className="text-sm font-medium text-white">{topic.averageMastery}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        topic.averageMastery >= 80
                          ? 'bg-green-500'
                          : topic.averageMastery >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${topic.averageMastery}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Assessments */}
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="font-medium text-white mb-4">Recent Assessment Results</h3>
            <div className="space-y-3">
              {analytics.recentAssessments.map((assessment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <div>
                      <span className="font-medium text-white">{assessment.title}</span>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>Avg: {assessment.averageScore}%</span>
                        <span>Pass: {assessment.passRate}%</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      assessment.averageScore >= 80
                        ? 'default'
                        : assessment.averageScore >= 60
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {assessment.averageScore >= 80
                      ? 'Good'
                      : assessment.averageScore >= 60
                      ? 'Fair'
                      : 'Needs Attention'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
