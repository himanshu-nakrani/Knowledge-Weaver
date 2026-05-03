import React, { useState } from "react";
import { 
  Search, Plus, Sparkles, BookOpen, BrainCircuit, 
  BarChart, Settings, Home, FileText, Clock, Hash, 
  MoreVertical, ChevronRight, Zap, Folder, Command
} from "lucide-react";

export function Signal() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#0f1117] text-slate-300 font-sans flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0f1117;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}} />
      
      {/* Top Bar */}
      <div className="h-12 border-b border-slate-800 bg-[#0f1117] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-400 w-1/3">
          <Command className="w-4 h-4" />
          <span className="text-xs font-mono tracking-wider text-slate-500">MINDFORGE</span>
        </div>
        
        <div className="flex-1 max-w-xl relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#38bdf8] transition-colors" />
          <input 
            type="text" 
            placeholder="Search documents, entities, or ask AI..." 
            className="w-full bg-[#151821] border border-slate-800 rounded-md py-1.5 pl-9 pr-12 text-sm text-slate-200 focus:outline-none focus:border-[#38bdf8]/50 focus:ring-1 focus:ring-[#38bdf8]/50 placeholder:text-slate-600 font-mono text-xs transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">⌘</kbd>
             <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">K</kbd>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-xs font-mono text-slate-500">SYNCED</span>
          </div>
          <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
             <span className="text-[10px] font-mono text-slate-300">UX</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-slate-800 bg-[#0c0d12] flex flex-col py-3 shrink-0">
          <div className="px-3 mb-2">
             <button className="w-full bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] rounded-md py-1.5 px-3 flex items-center gap-2 text-sm font-medium transition-colors">
               <Plus className="w-4 h-4" />
               New Entity
             </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2">
            <div className="px-2 space-y-0.5">
              {[
                { id: "home", icon: Home, label: "Dashboard" },
                { id: "docs", icon: FileText, label: "Documents", count: 142 },
                { id: "flashcards", icon: BookOpen, label: "Flashcards", count: 28 },
                { id: "agent", icon: BrainCircuit, label: "Agent Config" },
                { id: "analytics", icon: BarChart, label: "Analytics" },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    activeTab === item.id 
                      ? "bg-slate-800/60 text-[#38bdf8] font-medium" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    {item.label}
                  </div>
                  {item.count && (
                    <span className="text-[10px] font-mono text-slate-500">{item.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="px-4 text-[10px] font-mono font-medium text-slate-500 tracking-wider mb-2 uppercase">Collections</div>
              <div className="px-2 space-y-0.5">
                {["Engineering", "Product Specs", "Meeting Notes", "Research"].map((folder, i) => (
                  <button key={i} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-colors">
                    <Folder className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{folder}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="px-2 mt-auto">
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-slate-500 hover:text-slate-300 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-[#0f1117]">
          
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-6">
            
            {/* Header Area */}
            <div className="flex items-end justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-100 tracking-tight flex items-center gap-2">
                  System Overview
                </h1>
                <p className="text-sm font-mono text-slate-500 mt-1">
                  Node: 192.168.0.1 • 142 indexed entities • Last sync: 2m ago
                </p>
              </div>
              
              <div className="flex gap-2">
                <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Study Due (12)
                </button>
                <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Query Agent
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "KNOWLEDGE GRAPH", value: "1,204", unit: "nodes", change: "+12%" },
                { label: "RECENT ACTIVITY", value: "84", unit: "events/d", change: "+5%" },
                { label: "RETENTION RATE", value: "92", unit: "%", change: "-1%" },
                { label: "AGENT QUERIES", value: "342", unit: "reqs", change: "+44%" },
              ].map((stat, i) => (
                <div key={i} className="p-3 border border-slate-800 rounded-md bg-[#151821] flex flex-col gap-2">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{stat.label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl text-slate-200 font-medium">{stat.value}</span>
                    <span className="text-xs text-slate-500 font-mono">{stat.unit}</span>
                  </div>
                  <div className={`text-[10px] font-mono ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stat.change} vs last week
                  </div>
                </div>
              ))}
            </div>

            {/* Dense Data List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mt-4 mb-2">
                <h2 className="text-sm font-medium text-slate-300">Recent Documents</h2>
                <button className="text-[10px] font-mono text-[#38bdf8] hover:text-[#38bdf8]/80">VIEW_ALL</button>
              </div>
              
              <div className="border border-slate-800 rounded-md bg-[#0c0d12] overflow-hidden">
                {/* List Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-wider bg-[#151821]/50">
                  <div className="col-span-5">Entity Name</div>
                  <div className="col-span-3">Tags</div>
                  <div className="col-span-2">Word Count</div>
                  <div className="col-span-2 text-right">Last Modified</div>
                </div>
                
                {/* List Items */}
                <div className="divide-y divide-slate-800/50">
                  {[
                    { title: "Authentication Flow Redesign", type: "RFC", tags: ["auth", "security", "frontend"], words: "2,451", time: "10m ago" },
                    { title: "Q3 Roadmap Draft", type: "DOC", tags: ["planning", "q3"], words: "1,102", time: "1h ago" },
                    { title: "Vector DB Migration Plan", type: "TECH", tags: ["backend", "database", "ai"], words: "4,892", time: "3h ago" },
                    { title: "API Response Optimization", type: "RFC", tags: ["performance", "api"], words: "854", time: "Yesterday" },
                    { title: "Onboarding User Testing", type: "RESEARCH", tags: ["ux", "research", "feedback"], words: "3,120", time: "2 days ago" },
                    { title: "System Architecture V2", type: "DIAGRAM", tags: ["architecture", "infra"], words: "450", time: "2 days ago" },
                  ].map((doc, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-4 py-2.5 items-center hover:bg-slate-800/40 transition-colors group cursor-pointer">
                      <div className="col-span-5 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-600 group-hover:text-[#38bdf8] transition-colors" />
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm text-slate-300 font-medium truncate group-hover:text-white transition-colors">{doc.title}</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-800 text-[9px] font-mono text-slate-400">{doc.type}</span>
                        </div>
                      </div>
                      <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
                        {doc.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-[10px] font-mono text-slate-500">
                            <Hash className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="col-span-2 text-xs font-mono text-slate-500">
                        {doc.words}
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {doc.time}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 transition-all">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Sidebar - Agent Suggestions */}
          <div className="w-72 border-l border-slate-800 bg-[#0c0d12] flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-800">
               <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                 <BrainCircuit className="w-4 h-4 text-[#38bdf8]" />
                 Agent Analysis
               </div>
               <p className="text-xs text-slate-500 mt-1 font-mono">Real-time graph traversal</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              <div>
                <h3 className="text-[10px] font-mono font-medium text-slate-500 tracking-wider mb-3 uppercase">Related to current work</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-[#151821] border border-slate-800 hover:border-[#38bdf8]/40 rounded-md transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-slate-300 group-hover:text-[#38bdf8] transition-colors">Session Tokens V2</span>
                      <span className="text-[10px] font-mono text-emerald-400">98% Match</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">You referenced auth flow in your recent doc. This spec details the token strategy.</p>
                  </div>
                  <div className="p-3 bg-[#151821] border border-slate-800 hover:border-[#38bdf8]/40 rounded-md transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-slate-300 group-hover:text-[#38bdf8] transition-colors">Security Audit Q2</span>
                      <span className="text-[10px] font-mono text-emerald-400">84% Match</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">Contains relevant guidelines for implementing frontend auth.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-mono font-medium text-slate-500 tracking-wider mb-3 uppercase">Knowledge Gaps</h3>
                <div className="p-3 bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-md">
                   <p className="text-xs text-slate-400 mb-3">You've saved 4 articles about WebSockets recently, but haven't created any synthesis notes.</p>
                   <button className="w-full bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] text-xs font-mono py-1.5 rounded border border-[#38bdf8]/30 transition-colors">
                     Generate Summary
                   </button>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
