import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target, Clock, TrendingUp, Play } from 'lucide-react';
import { storage } from '../../services/storage';

export default function DashboardScreen() {
  const history = useMemo(() => storage.getHistory(), []);

  const stats = useMemo(() => {
    const total = history.length;
    const totalQ = history.reduce((s, h) => s + (h.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((s, h) => s + (h.correctAnswers || 0), 0);
    const avgScore = total > 0 ? history.reduce((s, h) => s + (h.score || 0), 0) / total : 0;
    return { total, totalQ, totalCorrect, avgScore: avgScore.toFixed(1) };
  }, [history]);

  const chartData = useMemo(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    history.forEach((h) => {
      if (!subjectMap[h.sector]) subjectMap[h.sector] = { total: 0, count: 0 };
      subjectMap[h.sector].total += h.score || 0;
      subjectMap[h.sector].count += 1;
    });
    return Object.entries(subjectMap).map(([name, data]) => ({
      name: name.length > 12 ? name.slice(0, 12) + '...' : name,
      score: Math.round(data.total / data.count),
    }));
  }, [history]);

  const recentSessions = history.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Track your exam practice progress</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: stats.total, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Questions Done', value: stats.totalQ, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Correct Answers', value: stats.totalCorrect, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Sessions</h3>
          <Link to="/history" className="text-sm text-primary-600 hover:underline">
            View All
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sessions yet. Start practicing!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{s.topic}</p>
                  <p className="text-sm text-gray-500">{s.sector} &middot; {s.level}</p>
                </div>
                <span className={`text-lg font-bold ${(s.score ?? 0) >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                  {s.score ?? 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/practice"
        className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition"
      >
        <Play size={18} />
        Start New Practice
      </Link>
    </div>
  );
}
