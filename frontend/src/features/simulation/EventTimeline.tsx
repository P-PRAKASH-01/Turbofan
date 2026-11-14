import React, { useState, useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { EventLogEntry } from '../../types/telemetry';
import { Clock, Info, AlertTriangle, AlertOctagon, Filter } from 'lucide-react';

export const EventTimeline: React.FC = () => {
  const { events } = useSimulation();
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'WARNING_OR_CRITICAL'>('ALL');

  // Deduplicate and group consecutive identical events
  const dedupedEvents = useMemo(() => {
    const list = events.filter((e) => {
      if (filterLevel === 'WARNING_OR_CRITICAL') {
        return e.level === 'WARNING' || e.level === 'CRITICAL' || e.level === 'ALERT';
      }
      return true;
    });

    const grouped: Array<{
      entry: EventLogEntry;
      count: number;
    }> = [];

    list.forEach((item) => {
      if (
        grouped.length > 0 &&
        grouped[grouped.length - 1].entry.message === item.message &&
        grouped[grouped.length - 1].entry.category === item.category &&
        grouped[grouped.length - 1].entry.level === item.level
      ) {
        grouped[grouped.length - 1].count += 1;
        grouped[grouped.length - 1].entry = item; // Keep most recent timestamp
      } else {
        grouped.push({ entry: item, count: 1 });
      }
    });

    return grouped;
  }, [events, filterLevel]);

  const getIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ALERT':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ALERT':
        return 'bg-red-950/60 border-red-800 text-red-300';
      case 'WARNING':
        return 'bg-amber-950/60 border-amber-800 text-amber-300';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">
            SIMULATION EVENT TIMELINE ({events.length} TOTAL · {dedupedEvents.length} UNIQUE)
          </span>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center space-x-1 text-xs font-mono">
          <Filter className="w-3 h-3 text-slate-500" />
          <button
            onClick={() => setFilterLevel(filterLevel === 'ALL' ? 'WARNING_OR_CRITICAL' : 'ALL')}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              filterLevel === 'WARNING_OR_CRITICAL'
                ? 'bg-amber-950 border-amber-700 text-amber-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {filterLevel === 'ALL' ? 'Showing All Events' : 'Filtered: Warnings Only'}
          </button>
        </div>
      </div>

      {/* Scrolling Deduplicated Event List */}
      <div className="my-2 max-h-64 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
        {dedupedEvents.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No events logged matching current filter.
          </div>
        ) : (
          dedupedEvents.map(({ entry: e, count }) => (
            <div
              key={e.id}
              className="bg-slate-950/80 p-2 rounded border border-slate-800/80 flex items-start space-x-2 hover:border-slate-700 transition-colors"
            >
              <div className="mt-0.5">{getIcon(e.level)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center space-x-1">
                    <span className="text-cyan-400 font-bold">t = {e.timestamp_s.toFixed(1)}s</span>
                    {count > 1 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-800 font-bold">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <span className={`px-1 py-0.2 rounded border font-semibold ${getBadgeStyle(e.level)}`}>
                    {e.category} | {e.level}
                  </span>
                </div>
                <div className="text-slate-200 font-semibold text-xs mt-0.5">{e.message}</div>
                {e.details && <div className="text-[11px] text-slate-400 mt-0.5">{e.details}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
        <span>Logged strictly with simulation clock timestamps.</span>
        <span>Deduplicated sequential event stream</span>
      </div>
    </div>
  );
};
