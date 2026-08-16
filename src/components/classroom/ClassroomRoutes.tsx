import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClassroomHome from '../../screens/ClassroomHome';
import TeacherDashboard, { TeacherDashboardContent } from '../../screens/TeacherDashboard';
import StudentDashboard from '../../screens/StudentDashboard';
import StudentTopicListScreen from '../../screens/classroom/StudentTopicListScreen';
import StudentTopicReader from '../../screens/classroom/StudentTopicReader';
import StudentProgressScreen from '../../screens/classroom/StudentProgressScreen';
import StudentAssessmentScreen from '../../screens/classroom/StudentAssessmentScreen';
import AssessmentResultsScreen from '../../screens/classroom/AssessmentResultsScreen';
import StudentAttendanceScreen from '../../screens/classroom/StudentAttendanceScreen';
import StudentAnnouncementsScreen from '../../screens/classroom/StudentAnnouncementsScreen';
import TeacherAttendanceScreen from '../../screens/classroom/TeacherAttendanceScreen';
import TeacherAnnouncementsScreen from '../../screens/classroom/TeacherAnnouncementsScreen';
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
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      {/* Classroom Entry */}
      <Route path="/" element={<ClassroomHome />} />

      {/* Student Dashboard */}
      <Route path="/:roomId/learn" element={<StudentDashboard />} />
      <Route path="/:roomId/learn/topics" element={<StudentTopicListScreen />} />
      <Route path="/:roomId/learn/topics/:topicId" element={<StudentTopicReader />} />
      <Route path="/:roomId/learn/progress" element={<StudentProgressScreen />} />
      <Route path="/:roomId/learn/assessments/:assessmentId" element={<StudentAssessmentScreen />} />
      <Route path="/:roomId/learn/assessments/:assessmentId/results" element={<AssessmentResultsScreen />} />
      <Route path="/:roomId/learn/attendance" element={<StudentAttendanceScreen />} />
      <Route path="/:roomId/learn/announcements" element={<StudentAnnouncementsScreen />} />

      {/* Teacher Dashboard with nested routes for Phase 2 screens */}
      <Route path="/:roomId" element={<TeacherDashboard />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboardContent />} />
        <Route path="topics" element={<TopicListScreen />} />
        <Route path="topics/add" element={<AddTopicForm />} />
        <Route path="topics/:topicId/edit" element={<AddTopicForm />} />
        <Route path="topics/:topicId/review" element={<TopicDraftReview />} />
        <Route path="topics/:topicId" element={<TopicReader />} />
        <Route path="assessments" element={<AssessmentsListScreen />} />
        <Route path="assessments/:assessmentId" element={<AssessmentsListScreen />} />
        <Route path="students" element={<StudentsScreen />} />
        <Route path="analytics" element={<AnalyticsScreen />} />
        <Route path="settings" element={<ClassroomSettingsScreen />} />
        <Route path="attendance" element={<TeacherAttendanceScreen />} />
        <Route path="announcements" element={<TeacherAnnouncementsScreen />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/classroom" replace />} />
    </Routes>
  );
}
