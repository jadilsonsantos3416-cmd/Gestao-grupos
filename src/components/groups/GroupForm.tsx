import React, { useState, useEffect } from 'react';
import { Group, GroupStatus, Renter, Nicho } from '@/src/types';
import { X, Search, Phone, User, Calendar, DollarSign, Users, Type, Link, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, parseISO } from 'date-fns';
import { extractGroupId } from '@/src/lib/groupParser';
import { listarNichos } from '@/src/lib/nichosService';

interface GroupFormProps {
  onClose: () => void;
  onSave: (group: any) => Promise<void>;
  editingGroup?: Group | null;
  existingGroups: Group[];
}

export function GroupForm({ onClose, onSave, editingGroup, existingGroups }: GroupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nichos, setNichos] = useState<Nicho[]>([]);

  useEffect(() => {
    const fetchNichos = async () => {
      try {
        const data = await listarNichos();
        setNichos(data);
      } catch (err) {
        console.error("Erro ao carregar nichos:", err);
      }
    };
    fetchNichos();
  }, []);
  
  const [formData, setFormData] = useState<Partial<Group>>({
    nome_grupo: '',
    link_grupo: '',
    group_id: '',
    nicho: '',
    status: 'Disponível' as GroupStatus,
    locatario: '',
    whatsapp: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    valor: 0,
    quantidade_membros: 0,
    perfil_compartilhando: 'Inativo',
    uso_shopee: 'Inativo',
    observacoes: '',
  });

  const duplicateGroup = React.useMemo(() => {
    if (!formData.link_grupo) return null;
    
    const currentId = formData.group_id;
    const currentLink = formData.link_grupo.trim().toLowerCase();

    return existingGroups.find(g => {
      // Ignorar se for o próprio grupo sendo editado
      if (editingGroup?.id && g.id === editingGroup.id) return false;

      // Se ambos tiverem ID numérico do Facebook, comparar por ele
      if (currentId && g.group_id === currentId) return true;

      // Caso contrário, comparar pelo link exato (removendo barras finais)
      const gLink = (g.link_grupo || "").trim().toLowerCase().split('?')[0].replace(/\/$/, "");
      const fLink = currentLink.split('?')[0].replace(/\/$/, "");
      
      return gLink === fLink && fLink !== "";
    });
  }, [formData.group_id, formData.link_grupo, existingGroups, editingGroup]);

  const [renterSearch, setRenterSearch] = useState('');
  const [showRenterSuggestions, setShowRenterSuggestions] = useState(false);
  const [nichoSearch, setNichoSearch] = useState('');
  const [showNichoSuggestions, setShowNichoSuggestions] = useState(false);
  const [showValorSuggestions, setShowValorSuggestions] = useState(false);

  // Extract unique renters
  const renters: Renter[] = React.useMemo(() => {
    const map = new Map<string, Renter>();
    existingGroups.forEach(g => {
      if (g.locatario) {
        const phone = g.whatsapp.replace(/\D/g, '');
        if (!map.has(phone)) {
          map.set(phone, {
            nome: g.locatario,
            whatsapp: g.whatsapp,
            lastValor: g.valor,
            lastVencimento: g.data_vencimento,
            groupCount: 1
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [existingGroups]);

  // Extract unique niches
  const nichesList: string[] = React.useMemo(() => {
    const set = new Set<string>();
    
    // De grupos existentes
    existingGroups.forEach(g => {
      if (g.nicho) {
        const normalized = g.nicho.trim();
        const existing = Array.from(set).find(s => s.toLowerCase() === normalized.toLowerCase());
        if (!existing) set.add(normalized);
      }
    });

    // Da coleção de nichos
    nichos.forEach(n => {
      const normalized = n.nome.trim();
      const existing = Array.from(set).find(s => s.toLowerCase() === normalized.toLowerCase());
      if (!existing) set.add(normalized);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [existingGroups, nichos]);

  // Extract unique monthly values
  const commonValores: number[] = React.useMemo(() => {
    const set = new Set<number>();
    existingGroups.forEach(g => {
      if (g.valor > 0) set.add(g.valor);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [existingGroups]);

  useEffect(() => {
    if (editingGroup) {
      setFormData({
        ...formData,
        ...editingGroup,
        nicho: editingGroup.nicho || 'Geral',
        status: editingGroup.status || 'Disponível',
        perfil_compartilhando: editingGroup.perfil_compartilhando || 'Inativo',
        uso_shopee: editingGroup.uso_shopee || 'Inativo'
      });
      setRenterSearch(editingGroup.locatario || '');
      setNichoSearch(editingGroup.nicho || 'Geral');
    }
  }, [editingGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    // Validação simples de duplicidade antes de salvar
    if (duplicateGroup) {
      setError(`Link já cadastrado no grupo: ${duplicateGroup.nome_grupo}`);
      return;
    }

    setError(null);
    setIsSaving(true);
    
    try {
      // Validação de campos obrigatórios
      if (!formData.nome_grupo?.trim()) {
        throw new Error("O nome do grupo é obrigatório.");
      }
      
      const normalizedNicho = nichesList.find(n => n.toLowerCase() === nichoSearch.trim().toLowerCase()) || nichoSearch.trim();
      let finalLocatario = renterSearch.trim();

      const finalData = { 
        ...formData, 
        nicho: normalizedNicho || 'Geral', 
        locatario: finalLocatario || '',
        status: formData.status || 'Disponível',
        perfil_compartilhando: formData.perfil_compartilhando || 'Inativo',
        uso_shopee: formData.uso_shopee || 'Inativo',
        quantidade_membros: Number(formData.quantidade_membros) || 0
      };
      
      await onSave(finalData);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError(err.message || "Erro ao salvar o grupo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectRenter = (renter: Renter) => {
    setFormData(prev => ({
      ...prev,
      locatario: renter.nome,
      whatsapp: renter.whatsapp,
      valor: renter.lastValor,
      data_vencimento: renter.lastVencimento,
      status: 'Alugado' as GroupStatus,
    }));
    setRenterSearch(renter.nome);
    setShowRenterSuggestions(false);
  };

  const selectNicho = (nicho: string) => {
    setFormData(prev => ({ ...prev, nicho }));
    setNichoSearch(nicho);
    setShowNichoSuggestions(false);
  };

  const selectValor = (valor: number) => {
    setFormData(prev => ({ ...prev, valor }));
    setShowValorSuggestions(false);
  };

  const filteredRenters = renters.filter(r => 
    r.nome.toLowerCase().includes(renterSearch.toLowerCase()) ||
    r.whatsapp.includes(renterSearch)
  );

  const filteredNiches = nichesList.filter(n => 
    n.toLowerCase().includes(nichoSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-none">
              {editingGroup ? 'Editar Grupo' : 'Cadastrar Grupo'}
            </h2>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Personalize as informações do grupo</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
            <X className="w-6 h-6 text-slate-300 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form id="group-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          {error && (
            <div className="p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex items-center gap-4 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-widest text-rose-800 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Group Info */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-3 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Dados do Grupo
              </h3>
              
              <FormField label="Nome do Grupo" icon={Type}>
                <input 
                  type="text" 
                  required
                  value={formData.nome_grupo || ''}
                  onChange={e => setFormData({...formData, nome_grupo: e.target.value})}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-black text-slate-700 placeholder:text-slate-300 placeholder:font-bold"
                  placeholder="Ex: Ofertas da Semana"
                />
              </FormField>

              <FormField label="Link do Grupo" icon={Link}>
                <input 
                  type="url" 
                  value={formData.link_grupo || ''}
                  onChange={e => {
                    const link = e.target.value;
                    setFormData({...formData, link_grupo: link, group_id: extractGroupId(link)});
                  }}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-blue-600 placeholder:text-slate-300"
                  placeholder="https://facebook.com/groups/..."
                />
              </FormField>

              {formData.group_id && (
                <div className="px-5 py-3 bg-slate-50 rounded-[1.25rem] border border-slate-100 flex items-center justify-between shadow-sm">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Facebook ID</span>
                  <span className="text-[10px] font-mono font-black text-slate-600">{formData.group_id}</span>
                </div>
              )}

              {!isSaving && duplicateGroup && (
                <div className="px-5 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex gap-4 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-[10px] font-bold">
                    <p className="font-black text-amber-900 uppercase tracking-widest text-[9px] mb-1">Atenção: Duplicado!</p>
                    <p className="text-amber-700 leading-relaxed uppercase tracking-wider">Este ID já pertence ao grupo: <span className="font-black underline">{duplicateGroup.nome_grupo}</span></p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <FormField label="Nicho" icon={Search}>
                    <input 
                      type="text" 
                      required
                      value={nichoSearch || ''}
                      onChange={e => {
                        setNichoSearch(e.target.value);
                        setFormData({...formData, nicho: e.target.value});
                        setShowNichoSuggestions(true);
                      }}
                      onFocus={() => setShowNichoSuggestions(true)}
                      className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-black text-slate-700 placeholder:text-slate-300 capitalize"
                      placeholder="Nicho..."
                    />
                  </FormField>

                  <AnimatePresence>
                    {showNichoSuggestions && filteredNiches.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                      >
                        {filteredNiches.map((nicho, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectNicho(nicho)}
                            className="w-full px-6 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col capitalize transition-colors"
                          >
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{nicho}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <FormField label="Membros" icon={Users}>
                  <input 
                    type="number" 
                    required
                    value={formData.quantidade_membros === undefined || formData.quantidade_membros === null ? '' : formData.quantidade_membros}
                    onChange={e => setFormData({...formData, quantidade_membros: parseInt(e.target.value) || 0})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-black text-slate-700 placeholder:text-slate-300"
                    placeholder="0"
                  />
                </FormField>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status de Locação</label>
                <div className="flex gap-3">
                  {(['Disponível', 'Alugado'] as GroupStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={cn(
                        "flex-1 py-3.5 rounded-2xl border-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        formData.status === s 
                          ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-100" 
                          : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configurações Atuais</label>
                <div className="grid grid-cols-2 gap-3">
                   <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.1em] ml-1">Postagens Ativas?</span>
                      <div className="flex gap-1.5">
                        {(['Ativo', 'Inativo'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({...formData, perfil_compartilhando: s})}
                            className={cn(
                              "flex-1 py-2 rounded-xl border font-black text-[8px] uppercase tracking-widest transition-all",
                              formData.perfil_compartilhando === s 
                                ? (s === 'Ativo' ? "bg-primary border-primary text-white shadow-lg shadow-green-50" :
                                  "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-50")
                                : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.1em] ml-1">Usa Shopee?</span>
                      <div className="flex gap-1.5">
                        {(['Ativo', 'Inativo'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({...formData, uso_shopee: s})}
                            className={cn(
                              "flex-1 py-2 rounded-xl border font-black text-[8px] uppercase tracking-widest transition-all",
                              formData.uso_shopee === s 
                                ? (s === 'Ativo' ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-50" :
                                  "bg-slate-400 border-slate-400 text-white shadow-lg shadow-slate-50")
                                : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Renter Info */}
            <div className={cn("space-y-6 transition-opacity", formData.status === 'Disponível' && "opacity-30 pointer-events-none")}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-3 flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                Dados da Locação
              </h3>
              
              <div className="relative">
                <FormField label="Nome do Locatário" icon={User}>
                  <input 
                    type="text" 
                    value={renterSearch || ''}
                    onChange={e => {
                      setRenterSearch(e.target.value);
                      setFormData({...formData, locatario: e.target.value});
                      setShowRenterSuggestions(true);
                    }}
                    onFocus={() => setShowRenterSuggestions(true)}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-black text-slate-700 placeholder:text-slate-300"
                    placeholder="Quem alugou?"
                  />
                </FormField>

                <AnimatePresence>
                  {showRenterSuggestions && filteredRenters.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                    >
                      {filteredRenters.map((renter, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectRenter(renter)}
                          className="w-full px-6 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col transition-colors"
                        >
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{renter.nome}</span>
                          <span className="text-[9px] text-slate-400 font-bold font-mono mt-1">{renter.whatsapp}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <FormField label="WhatsApp" icon={Phone}>
                <input 
                  type="text" 
                  value={formData.whatsapp || ''}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-black text-slate-700 placeholder:text-slate-300 font-mono"
                  placeholder="(00) 00000-0000"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Início" icon={Calendar}>
                  <input 
                    type="date" 
                    value={formData.data_inicio || ''}
                    onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-black text-slate-600"
                  />
                </FormField>
                <FormField label="Vencimento" icon={Calendar}>
                  <input 
                    type="date" 
                    value={formData.data_vencimento || ''}
                    onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-black text-primary"
                  />
                </FormField>
              </div>

                <div className="relative">
                  <FormField label="Valor Mensal" icon={DollarSign}>
                    <input 
                      type="number" 
                      value={formData.valor === 0 ? '' : formData.valor}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({...formData, valor: val});
                        setShowValorSuggestions(true);
                      }}
                      onFocus={() => setShowValorSuggestions(true)}
                      className="w-full bg-transparent border-0 focus:ring-0 p-0 text-base font-black text-primary font-mono tracking-tighter"
                      placeholder="0,00"
                    />
                  </FormField>

                  <AnimatePresence>
                    {showValorSuggestions && commonValores.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 bottom-full left-0 right-0 mb-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                      >
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Sugeridos
                        </div>
                        {commonValores.filter(v => formData.valor === 0 || v.toString().includes(formData.valor?.toString() || '')).map((v, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectValor(v)}
                            className={cn(
                              "w-full px-6 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 font-mono text-sm font-black transition-colors",
                              formData.valor === v ? "text-primary bg-green-50/50" : "text-slate-600"
                            )}
                          >
                            R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </div>
          </div>

          <div className="col-span-full">
            <FormField label="Observações Extra" icon={FileText}>
              <textarea 
                rows={3}
                value={formData.observacoes || ''}
                onChange={e => setFormData({...formData, observacoes: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-bold text-slate-600 resize-none placeholder:text-slate-200"
                placeholder="Ex internamente: trocar grupo dia 15..."
              />
            </FormField>
          </div>
        </form>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-50 bg-slate-50 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-5 px-6 bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-[2rem] hover:bg-slate-50 hover:text-slate-600 transition-all disabled:opacity-50"
          >
            Voltar
          </button>
          <button 
            type="submit"
            form="group-form"
            disabled={isSaving}
            className={cn(
              "flex-[2] py-5 px-6 text-white font-black text-[10px] uppercase tracking-widest rounded-[2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3",
              isSaving ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-accent shadow-green-200"
            )}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando Dados...
              </>
            ) : (
              'Confirmar e Salvar'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FormField({ label, icon: Icon, children }: any) {
  return (
    <div className="relative group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block transition-colors group-focus-within:text-primary">
        {label}
      </label>
      <div className="flex items-center gap-4 px-5 py-4 bg-slate-50/50 rounded-2xl border-2 border-transparent transition-all group-focus-within:border-green-100 group-focus-within:bg-white group-focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <Icon className="w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
