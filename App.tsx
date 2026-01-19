
import React, { useState, useMemo } from 'react';
import { Marketplace, Category, Deal } from './types';
import { MOCK_DEALS } from './constants';
import DealCard from './components/DealCard';
import DealDetail from './components/DealDetail';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Feed' | 'Watchlist' | 'Portfolio' | 'Alerts'>('Feed');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'Score' | 'Profit' | 'Newest'>('Score');

  const filteredDeals = useMemo(() => {
    let deals = [...MOCK_DEALS];
    if (categoryFilter !== 'All') {
      deals = deals.filter(d => d.category === categoryFilter);
    }
    if (searchQuery) {
      deals = deals.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (sortBy === 'Score') deals.sort((a, b) => b.dealScore - a.dealScore);
    if (sortBy === 'Profit') deals.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    
    return deals;
  }, [categoryFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 p-6 sticky top-0 h-screen bg-slate-900/50">
        <div className="flex items-center gap-3 mb-10">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
           </div>
           <h1 className="text-xl font-black text-white uppercase tracking-tighter">Deal Hunter</h1>
        </div>

        <nav className="space-y-1 mb-10">
          {(['Feed', 'Watchlist', 'Portfolio', 'Alerts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                 {tab === 'Feed' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                 {tab === 'Watchlist' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                 {tab === 'Portfolio' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                 {tab === 'Alerts' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
              </span>
              {tab}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Weekly Profit</p>
            <p className="text-xl font-black text-green-400 leading-tight">+$1,420.00</p>
            <p className="text-[10px] text-slate-500 mt-2">Target: $2,500</p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
               <div className="w-[56%] h-full bg-green-500"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 min-h-screen">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
             <input 
               type="text" 
               placeholder="Search deals (e.g. Sony TV, Milwaukee...)"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
             />
             <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <select 
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
             >
               <option>All</option>
               <option>Automotive</option>
               <option>Tech & Electronics</option>
               <option>TVs & Speakers</option>
               <option>Tools</option>
               <option>Gaming</option>
             </select>
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
               className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
             >
               <option value="Score">Sort: Deal Score</option>
               <option value="Profit">Sort: Est. Profit</option>
               <option value="Newest">Sort: Newest</option>
             </select>
             <button className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                 Live Deal Stream
                 <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </span>
              </h2>
              <p className="text-slate-500 text-sm font-medium">Scanned 1,242 items in the last 15 minutes near Austin, TX</p>
            </div>
            <div className="hidden lg:flex gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Market Status</p>
                <p className="text-xs font-bold text-green-400">OPTIMAL BUYING</p>
              </div>
            </div>
          </div>

          {filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
               <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-700">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <h3 className="text-xl font-bold text-slate-400">No deals found matching criteria</h3>
               <p className="text-slate-600 mt-2">Try adjusting filters or broaden your search area</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-2 flex justify-around z-50">
          {(['Feed', 'Watchlist', 'Portfolio', 'Alerts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                activeTab === tab ? 'text-blue-500' : 'text-slate-500'
              }`}
            >
              <div className="w-5 h-5">
                 {tab === 'Feed' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                 {tab === 'Watchlist' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                 {tab === 'Portfolio' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                 {tab === 'Alerts' && <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab}</span>
            </button>
          ))}
      </nav>

      {/* Deal Detail Overlay */}
      {selectedDeal && (
        <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
};

export default App;
