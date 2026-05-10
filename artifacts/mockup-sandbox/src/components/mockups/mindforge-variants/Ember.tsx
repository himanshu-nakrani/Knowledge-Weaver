import React from 'react';
import { Search, Home, FileText, Layers, Brain, BarChart2, Settings, Plus, MessageSquare, BookOpen, Clock, Tag, ChevronRight, Edit3 } from 'lucide-react';

const MOCK_DOCS = [
  { id: 1, title: 'Reflections on the Philosophy of Mind', tags: ['Philosophy', 'Cognition'], wordCount: 1240, lastEdited: '2 hours ago', excerpt: 'The nature of consciousness remains one of the most perplexing mysteries of modern science...' },
  { id: 2, title: 'Journal: March 14', tags: ['Journal', 'Daily'], wordCount: 850, lastEdited: 'Yesterday', excerpt: 'Woke up to the sound of rain against the window. It always puts me in a reflective mood...' },
  { id: 3, title: 'Notes on The Design of Everyday Things', tags: ['Reading', 'Design'], wordCount: 3100, lastEdited: 'Mar 10', excerpt: 'Don Norman emphasizes the importance of discoverability and feedback in design...' },
  { id: 4, title: 'Idea: Memory Palace App', tags: ['Ideas', 'Project'], wordCount: 420, lastEdited: 'Mar 8', excerpt: 'What if we could build a spatial interface for knowledge retrieval? Like a literal palace...' },
];

const RECOMMENDED = [
  { id: 101, title: 'Re-reading: Atomic Habits summary', reason: 'You were looking at habit trackers recently' },
  { id: 102, title: 'Draft: Winter Poetry Collection', reason: 'You usually write poetry on Sundays' },
];

const NAV_ITEMS = [
  { icon: Home, label: 'Home', active: true },
  { icon: FileText, label: 'Documents', active: false },
  { icon: Layers, label: 'Flashcards', active: false },
  { icon: Brain, label: 'Agent', active: false },
  { icon: BarChart2, label: 'Analytics', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export function Ember() {
  return (
    <div className="min-h-screen w-full flex text-stone-800" style={{ backgroundColor: '#faf7f2', fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;500;600&display=swap');
        
        .font-serif {
          font-family: "Playfair Display", serif;
        }
        
        .paper-card {
          background-color: #ffffff;
          box-shadow: 0 4px 14px rgba(146, 64, 14, 0.04), 0 1px 4px rgba(146, 64, 14, 0.02);
          border: 1px solid rgba(217, 119, 6, 0.1);
        }
        
        .paper-card:hover {
          box-shadow: 0 6px 20px rgba(146, 64, 14, 0.06), 0 2px 8px rgba(146, 64, 14, 0.03);
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-64 border-r border-amber-900/10 flex flex-col pt-8 pb-6 px-4 shrink-0" style={{ backgroundColor: '#fcfbfa' }}>
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center text-white">
            <BookOpen size={18} />
          </div>
          <span className="font-serif font-semibold text-xl tracking-wide text-amber-900">yukara</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                item.active 
                  ? 'bg-amber-100/50 text-amber-900' 
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <item.icon size={18} className={item.active ? 'text-amber-700' : 'text-stone-400'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/50">
            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">Daily Streak</h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="font-semibold text-amber-900">4 Days</div>
                <div className="text-xs text-amber-700/80">Keep writing!</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Search your notes, thoughts, memories..." 
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=fcfbfa" alt="User" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-8 pb-12 pt-6">
          <div className="max-w-5xl mx-auto flex gap-10">
            
            {/* Center Column */}
            <div className="flex-1">
              <header className="mb-10">
                <h1 className="font-serif text-4xl text-stone-900 mb-2">Good morning, Writer.</h1>
                <p className="text-stone-500">You have 4 new connections to explore in your garden.</p>
              </header>

              {/* Quick Actions */}
              <div className="flex gap-4 mb-12">
                <button className="flex items-center gap-2 px-5 py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-colors">
                  <Edit3 size={18} />
                  <span>New Entry</span>
                </button>
                <button className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-stone-200 hover:border-amber-300 text-stone-700 font-medium shadow-sm transition-colors">
                  <MessageSquare size={18} className="text-amber-600" />
                  <span>Ask Agent</span>
                </button>
                <button className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-stone-200 hover:border-amber-300 text-stone-700 font-medium shadow-sm transition-colors">
                  <Layers size={18} className="text-amber-600" />
                  <span>Review Flashcards</span>
                </button>
              </div>

              {/* Recent Documents */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl text-stone-800">Recent Pages</h2>
                  <button className="text-sm font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                    View all <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {MOCK_DOCS.map(doc => (
                    <div key={doc.id} className="paper-card rounded-2xl p-5 cursor-pointer">
                      <h3 className="font-serif text-lg font-medium text-stone-900 mb-2 leading-tight">{doc.title}</h3>
                      <p className="text-sm text-stone-500 mb-4 line-clamp-2 leading-relaxed">{doc.excerpt}</p>
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-auto pt-4 border-t border-stone-100">
                        <div className="flex gap-2">
                          {doc.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 text-stone-600 text-xs font-medium">
                              <Tag size={12} />
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 ml-auto text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {doc.lastEdited}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 shrink-0">
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-stone-200/60 sticky top-0">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Brain size={18} />
                  </div>
                  <h3 className="font-serif text-xl text-stone-800">AI Suggestions</h3>
                </div>

                <div className="space-y-4">
                  {RECOMMENDED.map(rec => (
                    <div key={rec.id} className="group p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:border-amber-200 transition-colors cursor-pointer">
                      <h4 className="font-medium text-stone-800 text-sm mb-1 group-hover:text-amber-800 transition-colors">{rec.title}</h4>
                      <p className="text-xs text-stone-500 leading-relaxed">{rec.reason}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-stone-200/60">
                  <h3 className="font-serif text-lg text-stone-800 mb-4">Mind Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Total Notes</span>
                      <span className="font-medium text-stone-800">142</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Words Written</span>
                      <span className="font-medium text-stone-800">45k</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Concepts Linked</span>
                      <span className="font-medium text-stone-800">89</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
