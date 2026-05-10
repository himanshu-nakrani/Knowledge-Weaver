import React, { useState } from 'react';
import { 
  Search, Bell, Home, FileText, Layers, BrainCircuit, BarChart3, 
  Settings, Plus, Sparkles, BookOpen, Clock, Hash, ChevronRight 
} from 'lucide-react';

export function Prism() {
  const [activeNav, setActiveNav] = useState('Home');

  const navItems = [
    { name: 'Home', icon: Home },
    { name: 'Documents', icon: FileText },
    { name: 'Flashcards', icon: Layers },
    { name: 'Agent', icon: BrainCircuit },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
  ];

  const recentDocs = [
    { title: 'Q3 Product Strategy', tags: ['work', 'planning'], words: 2450, edited: '2h ago' },
    { title: 'Mental Models for PMs', tags: ['learning', 'career'], words: 1200, edited: '5h ago' },
    { title: 'Japanese Vocabulary', tags: ['language', 'study'], words: 450, edited: '1d ago' },
    { title: 'Project Phoenix Specs', tags: ['work', 'engineering'], words: 3800, edited: '2d ago' },
  ];

  const recommended = [
    { title: 'How to take smart notes', type: 'Article' },
    { title: 'Review: Japanese Verbs', type: 'Flashcards' },
    { title: 'Synthesis: Product Strategy', type: 'AI Generated' },
  ];

  return (
    <div className="min-h-screen w-full overflow-auto bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .gradient-text {
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #2dd4bf 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-bg {
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #2dd4bf 100%);
        }
        .glass-card {
          background: rgba(24, 24, 27, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}} />
      
      <div className="flex h-screen overflow-hidden font-jakarta">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-800/50 bg-zinc-950 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              yukara
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group \${
                    isActive 
                      ? 'bg-zinc-900 text-white' 
                      : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                  }\`}
                >
                  <div className="relative flex items-center justify-center">
                    <item.icon className={\`w-5 h-5 \${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}\`} />
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full gradient-bg shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="p-4">
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Storage</div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-2/3 gradient-bg rounded-full"></div>
              </div>
              <div className="text-xs text-zinc-400 mt-2">6.2 GB of 10 GB used</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-[#09090b] relative overflow-hidden">
          {/* Topbar */}
          <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800/50 z-10 bg-zinc-950/50 backdrop-blur-md">
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search your second brain... (Cmd+K)" 
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-4">
              <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-400 rounded-full border-2 border-[#09090b]"></span>
              </button>
              <div className="w-8 h-8 rounded-full gradient-bg p-[1px] cursor-pointer">
                <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-950">
                  <span className="text-xs font-bold text-white">AJ</span>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto p-8 relative z-0">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen"></div>
            <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen"></div>

            <div className="max-w-6xl mx-auto flex gap-12">
              <div className="flex-1">
                {/* Hero */}
                <div className="mb-12">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                    Good morning, <span className="gradient-text">Alex.</span>
                  </h1>
                  <p className="text-zinc-400 text-lg">You have 3 review sessions scheduled and 12 unread notes today.</p>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-12">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <Plus className="w-5 h-5" />
                    New Document
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(129,140,248,0.2)]">
                    <Sparkles className="w-5 h-5" />
                    Ask AI
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors">
                    <BookOpen className="w-5 h-5 text-zinc-400" />
                    Study Session
                  </button>
                </div>

                {/* Recent Documents */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Recent Documents</h2>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center">
                      View all <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentDocs.map((doc, i) => (
                      <div key={i} className="group relative bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 hover:bg-zinc-800/40 transition-all cursor-pointer overflow-hidden">
                        {/* Gradient left border accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 gradient-bg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-zinc-100 text-lg line-clamp-1 group-hover:text-indigo-300 transition-colors">{doc.title}</h3>
                          <FileText className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                          {doc.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                              <Hash className="w-3 h-3 text-zinc-500" />
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {doc.words} words</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {doc.edited}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="w-80 hidden lg:block space-y-8">
                {/* AI Suggestions Widget */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 gradient-bg"></div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white">Recommended for you</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {recommended.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 group cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-700/50 group-hover:border-indigo-500/30 transition-colors">
                          {item.type === 'Flashcards' ? <Layers className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400" /> : 
                           item.type === 'Article' ? <BookOpen className="w-4 h-4 text-zinc-400 group-hover:text-teal-400" /> :
                           <BrainCircuit className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors leading-tight mb-1">{item.title}</p>
                          <p className="text-xs text-zinc-500">{item.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Calendar/Activity */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-zinc-400">Activity</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const intensity = Math.random();
                      return (
                        <div 
                          key={i} 
                          className={\`w-full aspect-square rounded-sm \${
                            intensity > 0.8 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 
                            intensity > 0.5 ? 'bg-indigo-500/60' : 
                            intensity > 0.2 ? 'bg-indigo-500/30' : 
                            'bg-zinc-800'
                          }\`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
