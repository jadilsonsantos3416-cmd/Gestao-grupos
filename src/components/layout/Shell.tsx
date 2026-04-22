import React, { useState } from 'react';
import { LayoutDashboard, Users, MessageSquare, Plus, Menu, X, Landmark, FileDown, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddGroup: () => void;
  onImportGroups: () => void;
  onCleanupData: () => void;
}

export function Shell({ 
  children, 
  activeTab, 
  setActiveTab, 
  onAddGroup, 
  onImportGroups,
  onCleanupData
}: ShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'groups', label: 'Grupos', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-green-600 p-1.5 rounded-lg">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Grupos FB</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-xl shadow-lg shadow-green-200">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none text-green-700">Grupos FB</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-1 whitespace-nowrap">Aluguel & Gestão</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                  isActive 
                    ? "bg-green-50 text-green-700 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-green-600" : "text-gray-400")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2 text-center">
          <button 
            onClick={onCleanupData}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-50 to-white border border-green-100 text-green-700 hover:border-green-200 font-bold py-2 rounded-xl transition-all active:scale-95 text-xs mb-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Faxina de Dados
          </button>
          
          <button 
            onClick={onImportGroups}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl transition-all active:scale-95"
          >
            <FileDown className="w-5 h-5 text-gray-400" />
            Importar Grupos
          </button>
          <button 
            onClick={onAddGroup}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Grupo
          </button>
        </div>
      </aside>

      {/* Mobile Side Menu Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
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
            className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-white shadow-2xl z-50 md:hidden p-6"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-green-600 p-2 rounded-xl">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-green-700">Grupos FB</span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-semibold",
                      isActive 
                        ? "bg-green-600 text-white shadow-lg shadow-green-200" 
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto absolute bottom-8 left-6 right-6 space-y-2">
              <button 
                onClick={() => {
                  onCleanupData();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold py-3 rounded-xl mb-2"
              >
                <Sparkles className="w-5 h-5" />
                Faxina de Dados
              </button>

              <button 
                onClick={() => {
                  onImportGroups();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-xl shadow-sm"
              >
                <FileDown className="w-5 h-5 text-gray-400" />
                Importar Grupos
              </button>
              <button 
                onClick={() => {
                  onAddGroup();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100"
              >
                <Plus className="w-5 h-5" />
                Novo Grupo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Floating Action Button (Alternative) */}
      <button 
        onClick={onAddGroup}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
