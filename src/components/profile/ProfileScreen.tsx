import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { User, BookOpen, Trophy, Clock, LogOut } from 'lucide-react';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const history = useMemo(() => storage.getHistory(), []);

  const stats = useMemo(() => {
    const total = history.length;
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = total > 0 ? history.reduce((s, h) => s + (h.score || 0), 0) / total : 0;
    const subjects = new Set(history.map((h) => h.sector)).size;
    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(1), subjects };
  }, [history]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      storage.removeToken();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
          <User size={36} className="text-primary-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Student</h1>
        <p className="text-gray-500">student@example.com</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Sessions', value: stats.total, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Questions', value: stats.totalQ, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Subjects', value: stats.subjects, icon: User, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {[
          { label: 'Edit Profile', action: () => {} },
          { label: 'Notification Settings', action: () => {} },
          { label: 'Help & Support', action: () => {} },
        ].map(({ label, action }, i) => (
          <button
            key={label}
            onClick={action}
            className={`w-full text-left px-6 py-4 text-gray-700 hover:bg-gray-50 transition ${
              i < 2 ? 'border-b border-gray-100' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
}
