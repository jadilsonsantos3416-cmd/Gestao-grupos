import React, { useState, useEffect } from 'react';
import { Nicho } from '@/src/types';
import { X, Plus, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { adicionarNicho, atualizarNicho } from '@/src/lib/nichosService';

interface NichoModalProps {
  isOpen: boolean;
  onClose: () => void;
  nichos: Nicho[];
  onUpdate: () => void;
}

export function NichoModal({ isOpen, onClose, nichos, onUpdate }: NichoModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingId) {
        await atualizarNicho(editingId, nome);
      } else {
        await adicionarNicho(nome);
      }
      setNome('');
      setEditingId(null);
      setIsAdding(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar nicho");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (nicho: Nicho) => {
    setEditingId(nicho.id);
    setNome(nicho.nome);
    setIsAdding(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNome('');
    setIsAdding(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-100"
      >
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight">Gerenciar Nichos</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-0.5">Adicione ou edite categorias</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-6">
          {isAdding ? (
            <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Nicho</label>
                <input 
                  type="text"
                  autoFocus
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Futebol, Novelas..."
                  className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 outline-none transition-all"
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-wider px-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={isSaving || !nome.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Salvar Edição' : 'Criar Nicho'}
                </button>
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em]"
            >
              <Plus className="w-5 h-5" />
              Adicionar Novo Nicho
            </button>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 mb-4">Nichos Salvos ({nichos.length})</h3>
            <div className="grid grid-cols-1 gap-2">
              {nichos.map(nicho => (
                <div key={nicho.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-100 hover:shadow-sm transition-all">
                  <span className="text-sm font-black text-slate-700 capitalize">{nicho.nome}</span>
                  <button 
                    onClick={() => startEdit(nicho)}
                    className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {nichos.length === 0 && (
                <div className="text-center py-10 text-slate-300 font-bold italic text-sm">
                  Nenhum nicho personalizado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
