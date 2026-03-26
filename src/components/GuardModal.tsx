import React from 'react';
import { X, User, Phone, Mail, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Guard } from '../types/site';

interface GuardModalProps {
  guard: Guard | null;
  open: boolean;
  onClose: () => void;
}

const GuardModal: React.FC<GuardModalProps> = ({ guard, open, onClose }) => {
  if (!open || !guard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {guard.user?.prenom} {guard.user?.nom}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              guard.statut === 'actif' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {guard.statut || 'Inactif'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>Numéro à venir</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Mail className="h-4 w-4" />
            <span>Email à venir</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>
              {guard.affectations_batiments?.length || 0} affectation(s)
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fermer
          </Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600">
            Voir Détails
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuardModal;
