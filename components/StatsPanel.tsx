import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { SystemStats } from '../types';
import { ShieldCheck, ShieldAlert, Activity, Camera } from 'lucide-react';

interface StatsPanelProps {
  stats: SystemStats;
  history: { time: string; violations: number }[];
}

const COLORS = ['#10b981', '#ef4444']; // Green, Red

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string; color: string }> = ({ 
  title, value, icon, subtext, color 
}) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</span>
      <div className={`p-2 rounded-md bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
        <span className={color}>{icon}</span>
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, history }) => {
  const complianceData = [
    { name: 'Compliant', value: stats.compliantRiders },
    { name: 'Violations', value: stats.violations },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Vehicles" 
          value={stats.totalMotorcycles} 
          icon={<Activity size={20} />} 
          subtext="Motorcycles Detected"
          color="text-blue-500"
        />
        <StatCard 
          title="Compliance Rate" 
          value={`${stats.totalMotorcycles > 0 ? Math.round((stats.compliantRiders / (stats.compliantRiders + stats.violations)) * 100) : 100}%`} 
          icon={<ShieldCheck size={20} />} 
          subtext="Helmet Usage"
          color="text-emerald-500"
        />
        <StatCard 
          title="Violations" 
          value={stats.violations} 
          icon={<ShieldAlert size={20} />} 
          subtext="Actionable Alerts"
          color="text-red-500"
        />
        <StatCard 
          title="System FPS" 
          value={stats.currentFPS.toFixed(1)} 
          icon={<Camera size={20} />} 
          subtext="Processing Latency"
          color="text-purple-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-64">
        {/* Violation History */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Violation Trend (Last Hour)</h4>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                />
                <Bar dataKey="violations" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Pie */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Compliance Distribution</h4>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center">
            {stats.totalMotorcycles === 0 ? (
              <p className="text-slate-600 text-sm">No data collected yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {complianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
