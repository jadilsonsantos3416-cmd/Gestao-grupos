import React, { useState, useEffect } from 'react';
import { Locatario, Group } from '@/src/types';
import { X, UserPlus, Phone, DollarSign, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LocatarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  groups: Group[];
  onSave: (locatario: Locatario) => Promise<void>;
  editingLocatario?: Locatario | null;
}

export function LocatarioModal({ isOpen, onClose, group, groups, onSave, editingLocatario }: LocatarioModalProps) {
  const [loading, setLoading] = useState(false);
  const [showRenterSuggestions, setShowRenterSuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const [showWhatsappSuggestions, setShowWhatsappSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Locatario, 'id'>>({
    nome: '',
    whatsapp: '',
    valor: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    status: 'Ativo'
  });

  // Extract smart data from groups
  const rentersData = React.useMemo(() => {
    const data = new Map<string, { whatsapp: Set<string>, valor: Set<string>, status: string }>();
    
    groups.forEach(g => {
      // From old fields
      if (g.locatario) {
        const name = g.locatario.trim();
        if (!data.has(name)) {
          data.set(name, { whatsapp: new Set(), valor: new Set(), status: g.status === 'Alugado' ? 'Ativo' : 'Inativo' });
        }
        const r = data.get(name)!;
        if (g.whatsapp) r.whatsapp.add(g.whatsapp);
        if (g.valor) r.valor.add(String(g.valor));
      }
      
      // From new array
      if (g.locatarios && g.locatarios.length > 0) {
        g.locatarios.forEach(l => {
          const name = l.nome.trim();
          if (!data.has(name)) {
            data.set(name, { whatsapp: new Set(), valor: new Set(), status: l.status });
          }
          const r = data.get(name)!;
          if (l.whatsapp) r.whatsapp.add(l.whatsapp);
          if (l.valor) r.valor.add(String(l.valor));
        });
      }
    });
    
    return data;
  }, [groups]);

  const uniqueRenterNames = React.useMemo(() => Array.from(rentersData.keys()).sort(), [rentersData]);
  
  const allUsedValues = React.useMemo(() => {
    const values = new Set<string>();
    groups.forEach(g => {
      if (g.valor) values.add(String(g.valor));
      g.locatarios?.forEach(l => {
        if (l.valor) values.add(String(l.valor));
      });
    });
    // Add defaults if missing
    ['100', '130', '150', '200'].forEach(v => values.add(v));
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [groups]);

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

  // Suggest due date (+30 days)
  useEffect(() => {
    if (formData.data_inicio && !editingLocatario) {
      const start = new Date(formData.data_inicio + 'T12:00:00');
      const due = new Date(start);
      due.setDate(due.getDate() + 30);
      setFormData(prev => ({ ...prev, data_vencimento: due.toISOString().split('T')[0] }));
    }
  }, [formData.data_inicio, editingLocatario]);

  const handleSelectRenter = (name: string) => {
    const r = rentersData.get(name);
    if (r) {
      const whatsappArray = Array.from(r.whatsapp);
      const valorArray = Array.from(r.valor);
      
      setFormData(prev => ({
        ...prev,
        nome: name,
        whatsapp: whatsappArray.length > 0 ? whatsappArray[0] : prev.whatsapp,
        valor: valorArray.length > 0 ? valorArray[0] : prev.valor,
        status: r.status as 'Ativo' | 'Inativo'
      }));
    } else {
      setFormData(prev => ({ ...prev, nome: name }));
    }
    setShowRenterSuggestions(false);
  };

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
              <div className="relative group z-[30]">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="Nome do locatário"
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                  value={formData.nome}
                  onFocus={() => setShowRenterSuggestions(true)}
                  onChange={e => {
                    setFormData({ ...formData, nome: e.target.value });
                    setShowRenterSuggestions(true);
                  }}
                />
                <AnimatePresence>
                  {showRenterSuggestions && (
                    <>
                      <div 
                        className="fixed inset-0 z-[-1]" 
                        onClick={() => setShowRenterSuggestions(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                      >
                        {uniqueRenterNames
                          .filter(n => n.toLowerCase().includes(formData.nome.toLowerCase()))
                          .map(name => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleSelectRenter(name)}
                              className="w-full px-5 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                            >
                              {name}
                            </button>
                          ))}
                        {uniqueRenterNames.filter(n => n.toLowerCase().includes(formData.nome.toLowerCase())).length === 0 && (
                          <div className="px-5 py-4 text-xs font-bold text-slate-300 italic">
                            Nenhum locatário correspondente
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative group z-[20]">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="WhatsApp"
                  autoComplete="off"
                  className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                  value={formData.whatsapp}
                  onFocus={() => setShowWhatsappSuggestions(true)}
                  onChange={e => {
                    setFormData({ ...formData, whatsapp: e.target.value });
                    setShowWhatsappSuggestions(true);
                  }}
                />
                <AnimatePresence>
                  {showWhatsappSuggestions && rentersData.get(formData.nome) && (
                    <>
                      <div 
                        className="fixed inset-0 z-[-1]" 
                        onClick={() => setShowWhatsappSuggestions(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto"
                      >
                        {Array.from(rentersData.get(formData.nome)!.whatsapp).map(wa => (
                          <button
                            key={wa}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, whatsapp: wa }));
                              setShowWhatsappSuggestions(false);
                            }}
                            className="w-full px-5 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                          >
                            {wa}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group z-[10]">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="Valor"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm text-slate-600 placeholder:text-slate-300 transition-all"
                    value={formData.valor}
                    onFocus={() => setShowValueSuggestions(true)}
                    onChange={e => {
                      setFormData({ ...formData, valor: e.target.value });
                      setShowValueSuggestions(true);
                    }}
                  />
                  <AnimatePresence>
                    {showValueSuggestions && (
                      <>
                        <div 
                          className="fixed inset-0 z-[-1]" 
                          onClick={() => setShowValueSuggestions(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto"
                        >
                          {allUsedValues
                            .filter(v => v.includes(String(formData.valor)))
                            .map(value => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, valor: value }));
                                  setShowValueSuggestions(false);
                                }}
                                className="w-full px-5 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                              >
                                {formatCurrency(Number(value))}
                              </button>
                            ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
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
