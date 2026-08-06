import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ChatThemeProvider } from './contexts/ChatThemeContext';
import { storage } from './services/storage';

const Layout = lazy(() => import('./components/layout/Layout'));
const OnboardingTour = lazy(() => import('./components/onboarding/OnboardingTour'));

const LandingScreen = lazy(() => import('./components/landing/LandingScreen'));
const LoginScreen = lazy(() => import('./components/auth/LoginScreen'));
const RegisterScreen = lazy(() => import('./components/auth/RegisterScreen'));
const DashboardScreen = lazy(() => import('./components/practice/DashboardScreen'));
const HomeScreen = lazy(() => import('./components/practice/HomeScreen'));
const QuizScreen = lazy(() => import('./components/practice/QuizScreen'));
const ResultsScreen = lazy(() => import('./components/practice/ResultsScreen'));
const HistoryScreen = lazy(() => import('./components/history/HistoryScreen'));
const StudyPlansScreen = lazy(() => import('./components/study/StudyPlansScreen'));
const ProfileScreen = lazy(() => import('./components/profile/ProfileScreen'));
const BookmarksScreen = lazy(() => import('./components/practice/BookmarksScreen'));
const ProgressScreen = lazy(() => import('./components/practice/ProgressScreen'));
const ExamSetupScreen = lazy(() => import('./components/practice/ExamSetupScreen'));
const ExamSimScreen = lazy(() => import('./components/practice/ExamSimScreen'));
const SearchScreen = lazy(() => import('./components/practice/SearchScreen'));
const AchievementsScreen = lazy(() => import('./components/achievements/AchievementsScreen'));
const RankingsScreen = lazy(() => import('./components/rankings/GlobalDashboard'));
const ImportQuestionsScreen = lazy(() => import('./components/import/ImportQuestionsScreen'));
const WeakAreasScreen = lazy(() => import('./components/practice/WeakAreasScreen'));
const SessionCompareScreen = lazy(() => import('./components/practice/SessionCompareScreen'));
const StudyGroupsScreen = lazy(() => import('./components/groups/StudyGroupsScreen'));
const MultiplayerLobbyScreen = lazy(() => import('./components/multiplayer/MultiplayerArena'));
const MultiplayerGameScreen = lazy(() => import('./components/multiplayer/GameRoom'));
const DocumentQuizScreen = lazy(() => import('./components/practice/DocumentQuizScreen'));
const FriendsScreen = lazy(() => import('./components/social/FriendsScreen'));
const FeedScreen = lazy(() => import('./components/social/FeedScreen'));
const ChatScreen = lazy(() => import('./components/social/ChatScreen'));
const GroupChatScreen = lazy(() => import('./components/social/GroupChatScreen'));
const GroupSettingsScreen = lazy(() => import('./components/social/GroupSettingsScreen'));
const StatusScreen = lazy(() => import('./components/social/StatusScreen'));
const StatusComposer = lazy(() => import('./components/social/StatusComposer'));
const SettingsScreen = lazy(() => import('./components/settings/SettingsScreen'));
const PrivacySettingsScreen = lazy(() => import('./components/settings/PrivacySettingsScreen'));
const AboutScreen = lazy(() => import('./components/settings/AboutScreen'));
const FenBot = lazy(() => import('./components/practice/FenBot'));

function RouteSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedLayout() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Layout />;
}

function ProtectedFullScreen({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!loading && isLoggedIn && !storage.getOnboardingComplete()) {
      const timer = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, isLoggedIn]);

  useEffect(() => {
    const handler = () => {
      navigate('/', { replace: true });
      setTimeout(() => setShowTour(true), 300);
    };
    window.addEventListener('start-tour', handler);
    return () => window.removeEventListener('start-tour', handler);
  }, [navigate]);

  const handleTourComplete = useCallback(() => {
    storage.setOnboardingComplete();
    setShowTour(false);
    window.dispatchEvent(new Event('tour-close-sidebar'));
    navigate('/', { replace: true });
  }, [navigate]);

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
    <Suspense fallback={<RouteSpinner />}>
      {showTour && <OnboardingTour open={showTour} onComplete={handleTourComplete} />}
      {isLoggedIn ? (
        <NotificationProvider>
          <ChatThemeProvider>
            <Routes>
              <Route path="/chat" element={<ProtectedFullScreen><ChatScreen /></ProtectedFullScreen>} />
              <Route path="/chat/:chatId" element={<ProtectedFullScreen><ChatScreen /></ProtectedFullScreen>} />
              <Route path="/groups-chat" element={<ProtectedFullScreen><GroupChatScreen /></ProtectedFullScreen>} />
              <Route path="/groups-chat/:groupId" element={<ProtectedFullScreen><GroupChatScreen /></ProtectedFullScreen>} />
              <Route path="/groups-chat/:groupId/settings" element={<ProtectedFullScreen><GroupSettingsScreen /></ProtectedFullScreen>} />
              <Route path="/fenbot" element={<ProtectedFullScreen><FenBot /></ProtectedFullScreen>} />
              <Route path="/" element={<ProtectedLayout />}>
                <Route index element={<DashboardScreen />} />
                <Route path="practice" element={<HomeScreen />} />
                <Route path="doc-quiz" element={<DocumentQuizScreen />} />
                <Route path="quiz" element={<QuizScreen />} />
                <Route path="exam-setup" element={<ExamSetupScreen />} />
                <Route path="exam" element={<ExamSimScreen />} />
                <Route path="results" element={<ResultsScreen />} />
                <Route path="history" element={<HistoryScreen />} />
                <Route path="bookmarks" element={<BookmarksScreen />} />
                <Route path="progress" element={<ProgressScreen />} />
                <Route path="search" element={<SearchScreen />} />
                <Route path="achievements" element={<AchievementsScreen />} />
                <Route path="rankings" element={<RankingsScreen />} />
                <Route path="import" element={<ImportQuestionsScreen />} />
                <Route path="weak-areas" element={<WeakAreasScreen />} />
                <Route path="compare" element={<SessionCompareScreen />} />
                <Route path="study-plans" element={<StudyPlansScreen />} />
                <Route path="groups" element={<StudyGroupsScreen />} />
                <Route path="multiplayer" element={<MultiplayerLobbyScreen />} />
                <Route path="multiplayer/:code" element={<MultiplayerGameScreen />} />
                <Route path="profile" element={<ProfileScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="privacy" element={<PrivacySettingsScreen />} />
                <Route path="about" element={<AboutScreen />} />
                <Route path="friends" element={<FriendsScreen />} />
                <Route path="feed" element={<FeedScreen />} />
                <Route path="statuses" element={<StatusScreen />} />
                <Route path="statuses/new" element={<StatusComposer />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ChatThemeProvider>
        </NotificationProvider>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/chat" element={<ProtectedFullScreen><ChatScreen /></ProtectedFullScreen>} />
          <Route path="/chat/:chatId" element={<ProtectedFullScreen><ChatScreen /></ProtectedFullScreen>} />
          <Route path="/groups-chat" element={<ProtectedFullScreen><GroupChatScreen /></ProtectedFullScreen>} />
          <Route path="/groups-chat/:groupId" element={<ProtectedFullScreen><GroupChatScreen /></ProtectedFullScreen>} />
          <Route path="/groups-chat/:groupId/settings" element={<ProtectedFullScreen><GroupSettingsScreen /></ProtectedFullScreen>} />
          <Route path="/fenbot" element={<ProtectedFullScreen><FenBot /></ProtectedFullScreen>} />
          <Route path="/" element={<LandingScreen />}>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </Suspense>
  );
}
