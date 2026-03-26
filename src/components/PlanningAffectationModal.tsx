import React from 'react';
import { X, Calendar, Clock, User, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card as CardType } from '../types/site';

interface PlanningAffectationModalProps {
  agent: CardType;
  batiment: CardType;
  loading?: boolean;
  onConfirm: (planningDetails: any) => void;
  onClose: () => void;
}

const PlanningAffectationModal: React.FC<PlanningAffectationModalProps> = ({
  agent,
  batiment,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      date: new Date().toISOString().split('T')[0],
      heure_debut: '08:00',
      heure_fin: '20:00',
      type: 'STANDARD',
    });
  };

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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Calendar className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Affectation avec Planning</h2>
            <p className="text-sm text-gray-500">Planifier l'agent</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{agent.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{batiment.name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="heure_debut">Heure début</Label>
              <Input id="heure_debut" type="time" defaultValue="08:00" />
            </div>
            <div>
              <Label htmlFor="heure_fin">Heure fin</Label>
              <Input id="heure_fin" type="time" defaultValue="20:00" />
            </div>
          </div>
          <div>
            <Label htmlFor="type">Type de service</Label>
            <Input id="type" placeholder="Standard, Nuit, Week-end..." defaultValue="STANDARD" />
          </div>
        </form>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button 
            className="flex-1 bg-orange-500 hover:bg-orange-600" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Traitement...' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanningAffectationModal;
