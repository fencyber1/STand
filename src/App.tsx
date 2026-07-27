import { Routes, Route, Navigate } from 'react-router-dom';
import { storage } from './services/storage';
import Layout from './components/layout/Layout';
import LandingScreen from './components/landing/LandingScreen';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import DashboardScreen from './components/practice/DashboardScreen';
import HomeScreen from './components/practice/HomeScreen';
import QuizScreen from './components/practice/QuizScreen';
import ResultsScreen from './components/practice/ResultsScreen';
import HistoryScreen from './components/history/HistoryScreen';
import StudyPlansScreen from './components/study/StudyPlansScreen';
import ProfileScreen from './components/profile/ProfileScreen';
import BookmarksScreen from './components/practice/BookmarksScreen';
import ProgressScreen from './components/practice/ProgressScreen';
import ExamSetupScreen from './components/practice/ExamSetupScreen';
import ExamSimScreen from './components/practice/ExamSimScreen';
import SearchScreen from './components/practice/SearchScreen';
import AchievementsScreen from './components/achievements/AchievementsScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = storage.getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const isLoggedIn = !!storage.getToken();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" replace /> : <RegisterScreen />} />
      <Route path="/" element={isLoggedIn ? <ProtectedRoute><Layout /></ProtectedRoute> : <LandingScreen />}>
        {isLoggedIn && (
          <>
            <Route index element={<DashboardScreen />} />
            <Route path="practice" element={<HomeScreen />} />
            <Route path="quiz" element={<QuizScreen />} />
            <Route path="exam-setup" element={<ExamSetupScreen />} />
            <Route path="exam" element={<ExamSimScreen />} />
            <Route path="results" element={<ResultsScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="bookmarks" element={<BookmarksScreen />} />
            <Route path="progress" element={<ProgressScreen />} />
            <Route path="search" element={<SearchScreen />} />
            <Route path="achievements" element={<AchievementsScreen />} />
            <Route path="study-plans" element={<StudyPlansScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
