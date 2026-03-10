import React from 'react';
import { ViolationRecord } from '../types';
import { AlertTriangle, Clock, MapPin, Hash } from 'lucide-react';

interface ViolationListProps {
  violations: ViolationRecord[];
}

const ViolationList: React.FC<ViolationListProps> = ({ violations }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          Recent Violations
        </h3>
        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full font-mono">
          LIVE
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {violations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50">
            <ShieldCheckIcon size={48} />
            <p className="text-sm">No violations detected</p>
          </div>
        ) : (
          violations.map((v) => (
            <div key={v.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 hover:border-red-500/50 transition-colors group">
              <div className="flex gap-3 mb-3">
                <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden relative border border-slate-600">
                   <img src={v.imageUrl} alt="Violation" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-red-400 font-bold text-xs uppercase tracking-wide">No Helmet</span>
                     <span className="text-slate-500 text-xs font-mono">{(v.confidence * 100).toFixed(0)}%</span>
                  </div>
                  
                  {v.vehicleNumber && (
                    <div className="mb-2 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-1 flex items-center gap-2">
                        <Hash size={12} className="text-yellow-400" />
                        <span className="text-yellow-400 font-mono font-bold text-xs tracking-wider">
                            {v.vehicleNumber}
                        </span>
                    </div>
                  )}

                  <div className="text-slate-300 text-sm flex items-center gap-1.5 mb-1">
                    <Clock size={12} className="text-slate-500" />
                    {v.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="text-slate-400 text-xs flex items-center gap-1.5 truncate">
                    <MapPin size={12} className="text-slate-500" />
                    {v.cameraLocation}
                  </div>
                </div>
              </div>
              <button className="w-full text-center py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors">
                View Evidence
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Simple icon component for empty state
const ShieldCheckIcon = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default ViolationList;