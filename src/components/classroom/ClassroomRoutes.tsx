import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClassroomHome from '../../screens/ClassroomHome';
import TeacherDashboard from '../../screens/TeacherDashboard';
import StudentDashboard from '../../screens/StudentDashboard';
import TopicListScreen from '../../screens/classroom/TopicListScreen';
import AddTopicForm from '../../screens/classroom/AddTopicForm';
import TopicDraftReview from '../../screens/classroom/TopicDraftReview';
import TopicReader from '../../screens/classroom/TopicReader';

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
      <Route path="/:roomId/assessments" element={<AssessmentsPlaceholder />} />
      <Route path="/:roomId/assessments/:assessmentId" element={<AssessmentsPlaceholder />} />
      <Route path="/:roomId/students" element={<StudentsPlaceholder />} />
      <Route path="/:roomId/analytics" element={<AnalyticsPlaceholder />} />
      <Route path="/:roomId/settings" element={<SettingsPlaceholder />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/classroom" replace />} />
    </Routes>
  );
}

function TopicsPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-slate-400">
        Topics management coming soon...
      </div>
    </div>
  );
}

function AssessmentsPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-slate-400">
        Assessments coming soon...
      </div>
    </div>
  );
}

function StudentsPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-slate-400">
        Students management coming soon...
      </div>
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-slate-400">
        Analytics dashboard coming soon...
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-slate-400">
        Classroom settings coming soon...
      </div>
    </div>
  );
}
