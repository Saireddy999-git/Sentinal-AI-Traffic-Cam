import React, { useState, useEffect, useCallback } from 'react';
import VideoFeed from './components/VideoFeed';
import StatsPanel from './components/StatsPanel';
import ViolationList from './components/ViolationList';
import { ViolationRecord, SystemStats } from './types';
import { Shield, Play, Pause, AlertCircle, LayoutDashboard } from 'lucide-react';

// Environment check for API Key
const hasApiKey = !!process.env.API_KEY;

const App: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalMotorcycles: 0,
    compliantRiders: 0,
    violations: 0,
    currentFPS: 0,
    accuracy: 96.5 // Baseline
  });
  
  // History for graph
  const [history, setHistory] = useState<{ time: string; violations: number }[]>([]);

  const handleViolation = useCallback((violation: ViolationRecord) => {
    // Prevent duplicate alerts in short timeframe
    setViolations(prev => {
      const last = prev[0];
      if (last && (violation.timestamp.getTime() - last.timestamp.getTime() < 3000)) {
        return prev;
      }
      return [violation, ...prev].slice(0, 50); // Keep last 50
    });
  }, []);

  const handleStatsUpdate = useCallback((motorcycles: number, compliant: number, newViolations: number, processingTime: number) => {
    setStats(prev => ({
      totalMotorcycles: prev.totalMotorcycles + motorcycles,
      compliantRiders: prev.compliantRiders + compliant,
      violations: prev.violations + newViolations,
      currentFPS: 1000 / processingTime,
      accuracy: prev.accuracy
    }));

    // Update graph history periodically
    const now = new Date();
    if (newViolations > 0) {
      setHistory(prev => {
        const newPoint = { 
          time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`, 
          violations: newViolations 
        };
        return [...prev, newPoint].slice(-10); // Keep last 10 points
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SentinelAI</h1>
              <p className="text-xs text-blue-400 font-medium tracking-wider">TRAFFIC ENFORCEMENT SYSTEM</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {!hasApiKey && (
               <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full text-sm border border-amber-500/20">
                 <AlertCircle size={14} />
                 <span>Demo Mode (No API Key)</span>
               </div>
             )}
             <button 
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all shadow-lg ${
                  isMonitoring 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/20'
                }`}
             >
                {isMonitoring ? (
                  <> <Pause size={18} /> PAUSE MONITORING </>
                ) : (
                  <> <Play size={18} /> START SURVEILLANCE </>
                )}
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Top Grid: Video & Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          
          {/* Left Column: Video Feed (Spans 2 cols) */}
          <div className="xl:col-span-2 space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="text-blue-500" size={18} />
                <h2 className="text-lg font-semibold text-white">Live Camera Feed</h2>
             </div>
             <VideoFeed 
                isActive={isMonitoring} 
                onViolation={handleViolation} 
                onStatsUpdate={handleStatsUpdate}
              />
             
             {/* Stats Panel underneath video for better layout on large screens */}
             <StatsPanel stats={stats} history={history} />
          </div>

          {/* Right Column: Violation Log */}
          <div className="xl:col-span-1 h-[calc(100vh-8rem)] sticky top-24">
             <ViolationList violations={violations} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
