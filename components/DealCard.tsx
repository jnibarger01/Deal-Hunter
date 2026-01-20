
import React from 'react';
import { Deal, Marketplace } from '../types';

interface DealCardProps {
  deal: Deal;
  onClick: (deal: Deal) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onClick }) => {
  const getMarketplaceColor = (mp: Marketplace) => {
    switch (mp) {
      case Marketplace.EBAY: return 'bg-blue-600';
      case Marketplace.FACEBOOK: return 'bg-blue-500';
      case Marketplace.CRAIGSLIST: return 'bg-purple-600';
      default: return 'bg-slate-600';
    }
  };

  const scoreColor = deal.dealScore > 90 ? 'text-green-400' : deal.dealScore > 80 ? 'text-yellow-400' : 'text-slate-400';
  const tmvLabel = deal.tmvDecision?.tmv.tmv ? `$${deal.tmvDecision.tmv.tmv.toFixed(0)} TMV` : null;
  const tmvAction = deal.tmvDecision?.recommendedAction?.action;

  return (
    <div 
      onClick={() => onClick(deal)}
      className="group relative bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={deal.imageUrl} 
          alt={deal.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex gap-2">
           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white ${getMarketplaceColor(deal.marketplace)}`}>
            {deal.marketplace}
          </span>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-slate-900/80">
            {deal.category}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
           <span className="text-xs font-semibold text-slate-300">Score: </span>
           <span className={`text-sm font-bold ${scoreColor}`}>{deal.dealScore}</span>
        </div>
        {tmvLabel && (
          <div className="absolute bottom-2 left-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
            <span className="text-xs font-semibold text-slate-300">{tmvLabel}</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-slate-100 line-clamp-2 text-sm md:text-base leading-tight">
            {deal.title}
          </h3>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-black text-white">${deal.price}</span>
            <span className="text-xs text-slate-400 line-through">${deal.marketValue} TMV</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
             <span>{deal.location}</span>
             <span>{deal.postedAt}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Est. Profit</span>
              <span className="text-green-400 font-bold text-lg leading-none">+${deal.estimatedProfit}</span>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
              {tmvAction ? tmvAction.replace('_', ' ') : 'Hunt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealCard;
