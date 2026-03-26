import React from 'react';
import { Clock, User } from 'lucide-react';
import { Planning } from '@/types/site';

interface AgentTimelineProps {
  plannings: Planning[];
}

const AgentTimeline: React.FC<AgentTimelineProps> = ({ plannings }) => {
  // Placeholder - Timeline des agents
  if (!plannings || plannings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Aucun planning disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plannings.map((planning, index) => (
        <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Shift {index + 1}</p>
            <p className="text-sm text-gray-500">
              {planning.heure_debut} - {planning.heure_fin}
            </p>
          </div>
          <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full border border-orange-100">
            {planning.type}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AgentTimeline;
