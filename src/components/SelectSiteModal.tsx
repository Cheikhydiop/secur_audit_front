import React from 'react';
import { X, MapPin } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Card as CardType } from '../types/site';

interface SelectSiteModalProps {
  agent: CardType | null;
  sites: any[];
  onSelect: (siteId: string) => void;
  onClose: () => void;
}

const SelectSiteModal: React.FC<SelectSiteModalProps> = ({ agent, sites, onSelect, onClose }) => {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-lg m-4 max-h-[80vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <MapPin className="h-6 w-6 text-sonatel-orange" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sélectionner un Site</h2>
            <p className="text-sm text-gray-500">
              Transférer l'agent: {agent.name}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {sites.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun site disponible</p>
          ) : (
            sites.map((site) => (
              <Card
                key={site.id}
                className="cursor-pointer hover:border-orange-300 hover:ring-2 hover:ring-orange-100 transition-all"
                onClick={() => onSelect(site.id.toString())}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-bold">{site.nom_site || site.nom}</p>
                      <p className="text-sm text-gray-500">{site.localisation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectSiteModal;
