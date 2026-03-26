import React from 'react';
import { MoreHorizontal, Building2, Users, MapPin, UserCheck } from 'lucide-react';
import { Card } from '../types/site';

interface ServiceColumnProps {
  title: string;
  count: number;
  cards: Card[];
  onDropCard?: (card: Card, toColumnTitle: string) => void;
  onDropOnCard?: (droppedCard: Card, targetCard: Card) => void;
  onCardClick?: (card: Card) => void;
  onCardMenuClick?: (card: Card) => void;
  allowDropCard?: boolean;
  acceptDropFrom?: string[];
  isCardDraggable?: boolean;
}

const ServiceColumn: React.FC<ServiceColumnProps> = ({
  title,
  count,
  cards,
  onCardClick,
  onCardMenuClick,
  allowDropCard = false,
}) => {
  const isOver = false;

  const getIcon = (type: string) => {
    switch (type) {
      case 'batiment':
        return <Building2 className="h-4 w-4" />;
      case 'agent':
      case 'agent-dispo':
      case 'agent-libre-site':
        return <Users className="h-4 w-4" />;
      case 'site':
        return <MapPin className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'batiment':
        return 'bg-orange-50 text-orange-600';
      case 'agent':
      case 'agent-dispo':
      case 'agent-libre-site':
        return 'bg-orange-100 text-sonatel-orange';
      case 'site':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div
      className={`flex flex-col min-h-[400px] rounded-3xl transition-all duration-200 ${isOver ? 'bg-orange-50 ring-2 ring-orange-200' : 'bg-white'
        }`}
    >
      {/* Column Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
            {title}
          </h3>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
            {count}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">Aucun élément</p>
          </div>
        ) : (
          cards.map((card, index) => (
            <div
              key={card.id || index}
              className={`relative p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group ${card.status === 'inactif' ? 'opacity-60' : ''
                }`}
              onClick={() => onCardClick?.(card)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-xl ${getTypeColor(card.type)}`}>
                  {getIcon(card.type)}
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCardMenuClick?.(card);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <h4 className="font-bold text-gray-800 mb-1 line-clamp-2">{card.name}</h4>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">{card.date}</span>
                {card.count > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                    {card.count} {card.countLabel || 'éléments'}
                  </span>
                )}
              </div>

              {card.type === 'batiment' && card.agents && card.agents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <div className="flex -space-x-2">
                    {card.agents.slice(0, 3).map((agent, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white"
                        title={agent}
                      >
                        {agent.charAt(0)}
                      </div>
                    ))}
                    {card.agents.length > 3 && (
                      <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
                        +{card.agents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceColumn;
