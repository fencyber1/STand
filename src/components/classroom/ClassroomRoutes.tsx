import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClassroomHome from '../../screens/ClassroomHome';
import TeacherDashboard from '../../screens/TeacherDashboard';
import StudentDashboard from '../../screens/StudentDashboard';
import TopicListScreen from '../../screens/classroom/TopicListScreen';
import AddTopicForm from '../../screens/classroom/AddTopicForm';
import TopicDraftReview from '../../screens/classroom/TopicDraftReview';
import TopicReader from '../../screens/classroom/TopicReader';
import StudentsScreen from '../../screens/classroom/StudentsScreen';
import AnalyticsScreen from '../../screens/classroom/AnalyticsScreen';
import ClassroomSettingsScreen from '../../screens/classroom/SettingsScreen';
import AssessmentsListScreen from '../../screens/classroom/AssessmentsListScreen';

/**
 * Routes for the Classroom feature.
 * Does not affect existing app routes or functionality.
 */
export default function ClassroomRoutes() {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      {/* Classroom Entry */}
      <Route path="/" element={<ClassroomHome />} />

      {/* Teacher Dashboard */}
      <Route path="/:roomId/dashboard" element={<TeacherDashboard />} />

      {/* Student Dashboard */}
      <Route path="/:roomId/learn" element={<StudentDashboard />} />

      {/* Placeholder routes for future phases */}
      <Route path="/:roomId/topics" element={<TopicListScreen />} />
      <Route path="/:roomId/topics/add" element={<AddTopicForm />} />
      <Route path="/:roomId/topics/:topicId/edit" element={<AddTopicForm />} />
      <Route path="/:roomId/topics/:topicId/review" element={<TopicDraftReview />} />
      <Route path="/:roomId/topics/:topicId" element={<TopicReader />} />
      <Route path="/:roomId/assessments" element={<AssessmentsListScreen />} />
      <Route path="/:roomId/assessments/:assessmentId" element={<AssessmentsListScreen />} />
      <Route path="/:roomId/students" element={<StudentsScreen />} />
      <Route path="/:roomId/analytics" element={<AnalyticsScreen />} />
      <Route path="/:roomId/settings" element={<ClassroomSettingsScreen />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/classroom" replace />} />
    </Routes>
  );
}
