import React, { useState, useEffect } from 'react';
import { Locatario, Group } from '@/src/types';
import { X, UserPlus, Phone, DollarSign, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LocatarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onSave: (locatario: Locatario) => Promise<void>;
  editingLocatario?: Locatario | null;
}

export function LocatarioModal({ isOpen, onClose, group, onSave, editingLocatario }: LocatarioModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Locatario, 'id'>>({
    nome: '',
    whatsapp: '',
    valor: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    status: 'Ativo'
  });

  useEffect(() => {
    if (editingLocatario) {
      setFormData({
        nome: editingLocatario.nome,
        whatsapp: editingLocatario.whatsapp,
        valor: editingLocatario.valor,
        data_inicio: editingLocatario.data_inicio,
        data_vencimento: editingLocatario.data_vencimento,
        status: editingLocatario.status
      });
    } else {
      setFormData({
        nome: '',
        whatsapp: '',
        valor: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        status: 'Ativo'
      });
    }
  }, [editingLocatario, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    setLoading(true);
    try {
      const payload: Locatario = {
        id: editingLocatario?.id || crypto.randomUUID(),
        ...formData
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar locatário:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="relative p-8">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {editingLocatario ? 'Editar Locatário' : 'Novo Locatário'}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[250px]">
                {group.nome_grupo}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="Nome do locatário"
                  className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="WhatsApp"
                  className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="Valor"
                    className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                    value={formData.valor}
                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                  />
                </div>
                <div className="relative group">
                  <select
                    className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 transition-all appearance-none"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Inativo' })}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                  <div className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
                    formData.status === 'Ativo' ? "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-400"
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                    <input
                      required
                      type="date"
                      className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 transition-all"
                      value={formData.data_inicio}
                      onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                    <input
                      required
                      type="date"
                      className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 transition-all"
                      value={formData.data_vencimento}
                      onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editingLocatario ? 'Salvar' : 'Adicionar'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
