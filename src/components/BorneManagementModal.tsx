import React from 'react';
import { X, QrCode, Settings, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface BorneManagementModalProps {
  batiment: {
    id: string | number;
    name: string;
    siteId?: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

const BorneManagementModal: React.FC<BorneManagementModalProps> = ({ batiment, onClose, onUpdate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-lg m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <QrCode className="h-6 w-6 text-sonatel-orange" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{batiment.name}</h2>
            <p className="text-sm text-gray-500">Gestion des Bornes</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <QrCode className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Générer QR Code</span>
            </div>
            <p className="text-sm text-gray-500">
              Créez un QR Code pour ce bâtiment
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Historique des rondes</span>
            </div>
            <p className="text-sm text-gray-500">
              Consultez l'historique des passages
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Configuration</span>
            </div>
            <p className="text-sm text-gray-500">
              Paramétrez les points de contrôle
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BorneManagementModal;
