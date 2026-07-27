import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import ImportQuestionsScreen from './components/import/ImportQuestionsScreen';
import WeakAreasScreen from './components/practice/WeakAreasScreen';
import SessionCompareScreen from './components/practice/SessionCompareScreen';
import StudyGroupsScreen from './components/groups/StudyGroupsScreen';
import MultiplayerLobbyScreen from './components/multiplayer/MultiplayerLobbyScreen';
import MultiplayerGameScreen from './components/multiplayer/MultiplayerGameScreen';

function ProtectedLayout() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" replace /> : <RegisterScreen />} />

      {isLoggedIn ? (
        <Route path="/" element={<ProtectedLayout />}>
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
          <Route path="import" element={<ImportQuestionsScreen />} />
          <Route path="weak-areas" element={<WeakAreasScreen />} />
          <Route path="compare" element={<SessionCompareScreen />} />
          <Route path="study-plans" element={<StudyPlansScreen />} />
          <Route path="groups" element={<StudyGroupsScreen />} />
          <Route path="multiplayer" element={<MultiplayerLobbyScreen />} />
          <Route path="multiplayer/:code" element={<MultiplayerGameScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="/" element={<LandingScreen />}>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}
