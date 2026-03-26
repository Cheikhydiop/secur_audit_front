import React from 'react';
import { Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface TracingRondesProps {
  siteId: string;
  siteName: string;
}

const TracingRondes: React.FC<TracingRondesProps> = ({ siteId, siteName }) => {
  // Placeholder - à implémenter avec le système de traçabilité des rondes
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-6 w-6 text-orange-500" />
        <h2 className="text-xl font-bold">Traçabilité des Rondes</h2>
      </div>

      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold mb-2">Module en cours de développement</h3>
        <p className="text-gray-500">
          <span>La traçabilité des rondes pour le site "{siteName}" sera disponible bientôt.</span>
        </p>
      </div>

      {/* Exemple de structure de données à intégrer */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium">Ronde matinale - Agents Present</p>
            <p className="text-sm text-gray-500">08:00 - Site principal</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium">Ronde de nuit - En cours</p>
            <p className="text-sm text-gray-500">22:00 - Bâtiment B</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TracingRondes;
