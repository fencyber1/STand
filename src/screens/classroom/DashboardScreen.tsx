import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useClassroom } from '../../contexts/ClassroomContext';
import {
  LayoutDashboard,
  Users,
  Bell,
  Zap,
  AlertTriangle,
  Clipboard,
  Heart,
  TrendingUp,
  Users as UsersIcon,
  Smartphone,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { NavItem } from '../../components/classroom/NavItem';
import { StatCard } from '../../components/classroom/StatCard';
import { ActionButton } from '../../components/classroom/ActionButton';
import { HeroHeader } from '../../components/classroom/HeroHeader';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { rooms, currentRoom } = useClassroom();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  // Sidebar state
  const [sidebarType, setSidebarType] = useState<'overlay' | 'fixed'>('overlay');
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const updateSidebarType = () => {
      setSidebarType(window.innerWidth < 640 ? 'overlay' : 'fixed');
    };
    updateSidebarType();
    window.addEventListener('resize', updateSidebarType);
    return () => window.removeEventListener('resize', updateSidebarType);
  }, []);

  // Sync sidebar type to viewport size on every route change (handles join/navigation)
  useEffect(() => {
    setSidebarType(window.innerWidth < 640 ? 'overlay' : 'fixed');
  }, [location.pathname]);

  // Header stats data
  const statsData = [
    { label: 'Total Students', value: rooms?.length?.toString() || '0', icon: UsersIcon },
    { label: 'Active Topics', value: (currentRoom?.topicsPublished || 0).toString(), icon: LayoutDashboard },
    { label: 'Completion Rate', value: '87%', icon: Heart },
    { label: 'AI Insights', value: '3 this week', icon: Zap },
  ];

  // Resolve the first available room so global links land on real pages.
  // Falls back to /classroom (room picker) when the user has no rooms yet.
  const primaryRoomId = currentRoom?.id ?? rooms?.[0]?.id;
  const roomPath = (suffix: string) =>
    primaryRoomId ? `/classroom/${primaryRoomId}/${suffix}` : '/classroom';
  const goRoom = (suffix: string) => () => navigate(roomPath(suffix));

  // Quick actions data
  const quickActions = [
    { title: 'Create Assessment', icon: LayoutDashboard, onClick: goRoom('assessments') },
    { title: 'Upload Materials', icon: Smartphone, onClick: goRoom('topics/add') },
    { title: 'Send Announcement', icon: Bell, onClick: goRoom('announcements') },
    { title: 'View Progress', icon: UsersIcon, onClick: goRoom('analytics') },
  ];

  // Navigation items for sidebar
  const navItems = [
    { title: 'Stats', icon: LayoutDashboard, href: '/classroom/dashboard' },
    { title: 'Students', icon: UsersIcon, href: roomPath('students') },
    { title: 'AI Insights', icon: Zap, href: roomPath('analytics') },
    { title: 'Progress', icon: TrendingUp, href: roomPath('students') },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Header */}
      <HeroHeader
        title="Classroom Dashboard"
        subtitle="Student progress & AI-powered insights"
        onClose={() => navigate('/')}
      />

      {/* Sidebar Navigation */}
      <nav
        className="flex flex-col md:flex-row w-full md:w-64 h-screen bg-gray-900/95 border-r gray-700/50 shadow-sm transition-transform duration-300 transform md:translateX-0 -translate-x-full"
        aria-label="Main navigation"
      >
        {/* Mobile menu toggle button */}
        {sidebarType === 'overlay' && (
          <Button
            variant="outline"
            size="sm"
            className="mb-4 md:mb-0 absolute left-4 top-4 z-50"
            onClick={() => setSidebarType('fixed')}
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        )}

        {/* Navigation Items */}
        <nav aria-label="Classroom navigation" className="flex-1 flex flex-col md:flex-row">
          {navItems.map((item) => (
            <NavItem
              key={item.title}
              title={item.title}
              icon={item.icon as any}
              href={item.href}
              active={location.pathname === item.href}
              onSelect={() => {
                setCollapsed(true);
                setSidebarType('overlay');
                navigate(item.href);
              }}
            />
          ))}
        </nav>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-8 flex-1">
        {/* Stats Overview Section */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon as any}
              value={stat.value}
              label={stat.label}
              variant="primary"
            />
          ))}
        </section>

        {/* Quick Actions Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <ActionButton
              key={action.title}
              variant="secondary"
              size="sm"
              leftIcon={action.icon as any}
              onClick={action.onClick}
            >
              {action.title}
            </ActionButton>
          ))}
        </section>

        {/* AI Insights Alert Panel */}
        <section className="bg-gray-800/50 border rounded-lg p-6 md:p-8 mb-8 border-gray-700/50">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <div>
              <h3 className="text-lg font-medium text-white">AI-Generated Insights</h3>
              <p className="text-gray-300 text-sm mt-1">
                The AI has identified 3 key areas for improvement this week. Would you like to
                review the detailed analysis or set up targeted interventions?
              </p>
            </div>
          </div>
        </section>

        {/* Student Progress Snapshot */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Student Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Progress item 1 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Alice Johnson</p>
              <p className="text-xs text-gray-400">Completion: 95%</p>
              <div className="w-full bg-gray-700 rounded-h h-2">
                <div
                  className="h-full bg-blue-600 rounded-h transition-all duration-500"
                  style={{ width: '95%' }}
                />
              </div>
            </div>

            {/* Progress item 2 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Bob Smith</p>
              <p className="text-xs text-gray-400">Completion: 78%</p>
              <div className="w-full bg-gray-700 rounded-h h-2">
                <div
                  className="h-full bg-blue-600 rounded-h transition-all duration-500"
                  style={{ width: '78%' }}
                />
              </div>
            </div>

            {/* Progress item 3 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Charlie Brown</p>
              <p className="text-xs text-gray-400">Completion: 62%</p>
              <div className="w-full bg-gray-700 rounded-h h-2">
                <div
                  className="h-full bg-blue-600 rounded-h transition-all duration-500"
                  style={{ width: '62%' }}
                />
              </div>
            </div>

            {/* Progress item 4 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400">Diana Ross</p>
              <p className="text-xs text-gray-400">Completion: 45%</p>
              <div className="w-full bg-gray-700 rounded-h h-2">
                <div
                  className="h-full bg-blue-600 rounded-h transition-all duration-500"
                  style={{ width: '45%' }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}