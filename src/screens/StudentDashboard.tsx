import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassroom } from '../contexts/ClassroomContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  FileText,
} from 'lucide-react';

/**
 * Student dashboard showing their classroom learning progress.
 * Does not affect any existing components or flows.
 */
export default function StudentDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, refreshRoom, subscribeToCurrentRoom } = useClassroom();

  useEffect(() => {
    if (roomId) {
      refreshRoom();
    }
    const unsubscribe = subscribeToCurrentRoom();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId]);

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          Loading classroom...
        </div>
      </div>
    );
  }

  // Mock data for demonstration - will be replaced with real data
  const currentTopic = {
    title: 'Hazard Identification and Risk Assessment',
    progress: 72,
    description: 'Learn to identify workplace hazards and assess risks effectively.',
  };

  const recentTopics = [
    { id: '1', title: 'Hazard Identification', completed: true, progress: 100 },
    { id: '2', title: 'Risk Assessment Methods', completed: true, progress: 90 },
    { id: '3', title: 'PPE Selection', completed: true, progress: 85 },
    { id: '4', title: 'Emergency Response', completed: false, progress: 30 },
  ];

  const assignments = [
    {
      id: '1',
      title: 'Risk Matrix Exercise',
      dueDate: new Date(Date.now() + 86400000 * 2),
      type: 'practice',
      completed: false,
    },
    {
      id: '2',
      title: 'Case Study: Chemical Spill',
      dueDate: new Date(Date.now() + 86400000 * 5),
      type: 'assignment',
      completed: false,
    },
  ];

  const weakAreas = ['Risk Matrix Calculations', 'PPE Standards'];

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
            Exit
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* MY CLASSROOM Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">MY CLASSROOM</h2>

          <Card className="bg-slate-800 border-slate-700 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  {currentTopic.title}
                </h3>
                <Badge variant="secondary">
                  {currentTopic.progress}% Complete
                </Badge>
              </div>

              <p className="text-slate-300 mb-4">
                {currentTopic.description}
              </p>

              <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${currentTopic.progress}%` }}
                />
              </div>

              <Button
                onClick={() => navigate(`/classroom/${roomId}/learn/${currentTopic.title}`)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Continue →
              </Button>
            </div>
          </Card>
        </section>

        {/* MY LEARNING Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">MY LEARNING</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Topics Progress */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <h3 className="font-medium text-white mb-3">Topics</h3>
                  <div className="space-y-3">
                    {recentTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/classroom/${roomId}/learn/${topic.title}`)}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          {topic.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{topic.title}</p>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-sm text-slate-300">{topic.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Assignments */}
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <h3 className="font-medium text-white mb-3">Assignments</h3>
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{assignment.title}</p>
                <p className="text-sm text-slate-400">
                  Due {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
                        </div>
                        <Badge
                          variant={assignment.completed ? 'default' : 'secondary'}
                        >
                          {assignment.completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Recommendations & Weak Areas */}
            <div className="space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-medium text-white">AI Recommendations</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Review PPE selection guidelines</li>
                    <li>• Practice risk matrix calculations</li>
                    <li>• Take the Hazard Identification quiz</li>
                  </ul>
                </div>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-red-400" />
                    <h3 className="font-medium text-white">Weak Areas</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {weakAreas.map((area) => (
                      <li key={area} className="flex items-center justify-between">
                        <span>{area}</span>
                        <Badge variant="destructive">Needs Practice</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
