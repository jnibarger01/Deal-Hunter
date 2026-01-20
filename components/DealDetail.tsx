
import React, { useState, useEffect } from 'react';
import { Deal, RepairInsight, NegotiationScript } from '../types';
import { analyzeDealForRepair, generateNegotiationStrategy, getPriceTrend } from '../services/aiClient';

interface DealDetailProps {
  deal: Deal;
  onClose: () => void;
}

const DealDetail: React.FC<DealDetailProps> = ({ deal, onClose }) => {
  const [repairInsight, setRepairInsight] = useState<RepairInsight | null>(null);
  const [negotiation, setNegotiation] = useState<NegotiationScript | null>(null);
  const [trend, setTrend] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAI = async () => {
      setLoading(true);
      try {
        const [r, n, t] = await Promise.all([
          analyzeDealForRepair(deal),
          generateNegotiationStrategy(deal),
          getPriceTrend(deal.title)
        ]);
        setRepairInsight(r);
        setNegotiation(n);
        setTrend(t);
      } catch (e) {
        console.error("AI Insights failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadAI();
  }, [deal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 shadow-2xl flex flex-col md:flex-row">

        {/* Left: Product Media & Info */}
        <div className="md:w-1/2 p-6 border-r border-slate-800">
          <button onClick={onClose} className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Feed
          </button>
          <img src={deal.imageUrl} alt={deal.title} className="w-full rounded-xl mb-6 shadow-lg" />

          <h2 className="text-2xl font-black text-white mb-2 leading-tight">{deal.title}</h2>

          <div className="flex items-center gap-4 mb-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">List Price</p>
              <p className="text-2xl font-black text-white">${deal.price}</p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Market Value</p>
              <p className="text-2xl font-black text-slate-400">${deal.marketValue}</p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">ROI</p>
              <p className="text-2xl font-black text-green-400">+{Math.round((deal.estimatedProfit / deal.price) * 100)}%</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                {deal.description}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">{deal.marketplace}</span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">{deal.condition} condition</span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">{deal.location}</span>
            </div>
          </div>
        </div>

        {/* Right: AI Intelligence Engine */}
        <div className="md:w-1/2 p-6 bg-slate-800/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
              Deal Intelligence
            </h3>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Deal Score</p>
              <p className="text-2xl font-black text-blue-400">{deal.dealScore}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 animate-pulse font-mono uppercase">Consulting digital bloodhound...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Repair Analysis */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Repair Analysis</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${repairInsight?.difficulty === 'Beginner' ? 'bg-green-600' :
                      repairInsight?.difficulty === 'Intermediate' ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                    {repairInsight?.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3">{repairInsight?.summary}</p>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <p className="text-slate-500 font-bold uppercase mb-1">Likely Issue</p>
                    <p className="text-slate-200">{repairInsight?.likelyIssue}</p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <p className="text-slate-500 font-bold uppercase mb-1">Parts Cost</p>
                    <p className="text-slate-200">{repairInsight?.partsCostEst}</p>
                  </div>
                </div>
              </div>

              {/* Market Trend */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-bold text-white uppercase tracking-tighter mb-2">Market Trend</h4>
                <p className="text-xs text-slate-300 italic">"{trend}"</p>
              </div>

              {/* Negotiation Script */}
              <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/30">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-tighter">Negotiation AI</h4>
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 font-bold uppercase">Target Offer</p>
                    <p className="text-lg font-black text-blue-400 leading-none">${negotiation?.suggestedOffer}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-tighter">Opening Script</p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 relative group">
                      {negotiation?.opening}
                      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px]">
                    <div className="flex-1">
                      <p className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Approach</p>
                      <p className="text-slate-400">{negotiation?.approach}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Counter-Offer</p>
                      <p className="text-slate-400">{negotiation?.lowballBuffer}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button className="flex-1 bg-white text-slate-950 font-black py-3 rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest text-sm shadow-xl">
                  Go to Listing
                </button>
                <button className="px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-700 hover:border-blue-500 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealDetail;
