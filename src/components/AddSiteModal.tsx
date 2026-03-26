import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ open, onClose, onSubmit }) => {
  if (!open) return null;

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
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Plus className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Ajouter un Site</h2>
            <p className="text-sm text-gray-500">Créer un nouveau site</p>
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du site</Label>
            <Input id="nom" placeholder="Ex: Agence Almadies" />
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="Ex: SN-DKR-001" />
          </div>
          <div>
            <Label htmlFor="zone">Zone</Label>
            <Input id="zone" placeholder="Ex: DAKAR" />
          </div>
          <div>
            <Label htmlFor="localisation">Localisation</Label>
            <Input id="localisation" placeholder="Adresse complète" />
          </div>
        </form>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600">
            Créer le site
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddSiteModal;
