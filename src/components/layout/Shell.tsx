import React, { useState } from 'react';
import { LayoutDashboard, Users, MessageSquare, Plus, Menu, X, Landmark, FileUp, Sparkles, Trophy, Brain, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { QuickFilter } from '@/src/types';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeFilter: QuickFilter;
  setActiveFilter: (filter: QuickFilter) => void;
  onAddGroup: () => void;
  onImportGroups: () => void;
  onCleanupData: () => void;
}

export function Shell({ 
  children, 
  activeTab, 
  setActiveTab, 
  activeFilter,
  setActiveFilter,
  onAddGroup, 
  onImportGroups,
  onCleanupData
}: ShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'groups', label: 'Grupos', icon: Users },
    { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'ranking', label: 'Ranking Postagem', icon: Trophy },
    { id: 'growth', label: 'Análise Crescimento', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-lg border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-green-100">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">Grupos <span className="text-primary">FB</span></span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-90"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 288 }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 sticky top-0 h-screen overflow-hidden group/sidebar"
      >
        <div className={cn("p-6 md:p-8 border-b border-slate-50 relative", isCollapsed && "px-4")}>
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-green-100 shrink-0">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="font-extrabold text-xl tracking-tight leading-none text-slate-900">Grupos <span className="text-primary">FB</span></span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1.5 whitespace-nowrap">Gestão de Grupos</span>
              </motion.div>
            )}
          </div>

          <button 
            onClick={toggleSidebar}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary shadow-sm z-50 transition-colors opacity-0 group-hover/sidebar:opacity-100"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className={cn("flex-1 p-6 space-y-1.5 pt-8", isCollapsed && "p-3")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setActiveFilter('all');
                }}
                title={isCollapsed ? item.label : ""}
                className={cn(
                  "w-full flex items-center transition-all duration-200 font-semibold text-sm",
                  isCollapsed ? "justify-center p-3.5 rounded-xl" : "gap-3.5 px-4 py-3.5 rounded-2xl",
                  isActive 
                    ? "bg-slate-950 text-white shadow-md shadow-slate-200 scale-[1.02]" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-emerald-400" : "text-slate-400")} />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn("p-6 border-t border-slate-50 space-y-3", isCollapsed && "p-3")}>
          <button 
            onClick={onCleanupData}
            title={isCollapsed ? "Faxina de Dados" : ""}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-accent font-bold rounded-2xl transition-all active:scale-95 text-xs shadow-sm shadow-green-50/50",
              isCollapsed ? "h-12 w-12 mx-auto rounded-xl" : "py-3"
            )}
          >
            <Sparkles className={cn("text-primary shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!isCollapsed && <span>Faxina de Dados</span>}
          </button>
          
          <button 
            onClick={onImportGroups}
            title={isCollapsed ? "Importar" : ""}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl transition-all active:scale-95 text-sm",
              isCollapsed ? "h-12 w-12 mx-auto rounded-xl" : "py-3"
            )}
          >
            <FileUp className={cn("text-slate-400 shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
            {!isCollapsed && <span>Importar</span>}
          </button>
          <button 
            onClick={onAddGroup}
            title={isCollapsed ? "Novo Grupo" : ""}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-primary hover:bg-accent text-white font-bold rounded-[1.5rem] shadow-xl shadow-green-100 transition-all active:scale-95 text-sm",
              isCollapsed ? "h-12 w-12 mx-auto rounded-xl" : "py-4 rounded-3xl"
            )}
          >
            <Plus className={cn("shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
            {!isCollapsed && <span>Novo Grupo</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Side Menu Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-white shadow-2xl z-50 md:hidden flex flex-col"
          >
            <div className="p-8 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl">
                  <Landmark className="w-6 h-6 text-white" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">Grupos FB</span>
              </div>
            </div>

            <nav className="p-6 space-y-2 mt-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setActiveFilter('all');
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all font-bold text-base",
                      isActive 
                        ? "bg-slate-950 text-white shadow-xl shadow-slate-200" 
                        : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    <Icon className={cn("w-6 h-6", isActive ? "text-emerald-400" : "text-slate-400")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-6 border-t border-slate-50 space-y-3 mt-auto mb-8">
              <button 
                onClick={() => {
                  onCleanupData();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 bg-green-50 text-accent font-bold py-4 rounded-2xl"
              >
                <Sparkles className="w-5 h-5" />
                Faxina de Dados
              </button>

              <button 
                onClick={() => {
                  onImportGroups();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl shadow-sm"
              >
                <FileUp className="w-5 h-5 text-slate-400" />
                Importar Grupos
              </button>
              <button 
                onClick={() => {
                  onAddGroup();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 bg-primary text-white font-bold py-5 rounded-[2rem] shadow-xl shadow-green-100"
              >
                <Plus className="w-6 h-6 transition-transform group-active:scale-90" />
                Novo Grupo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto p-4 md:p-10 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -5 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Floating Action Button (Alternative) */}
      <button 
        onClick={onAddGroup}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
