import React, { useState, useEffect } from 'react';
import { Group, GroupStatus, Renter } from '@/src/types';
import { X, Search, Phone, User, Calendar, DollarSign, Users, Type, Link, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, parseISO } from 'date-fns';
import { extractGroupId } from '@/src/lib/groupParser';

interface GroupFormProps {
  onClose: () => void;
  onSave: (group: any) => Promise<void>;
  editingGroup?: Group | null;
  existingGroups: Group[];
}

export function GroupForm({ onClose, onSave, editingGroup, existingGroups }: GroupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
  const niches: string[] = React.useMemo(() => {
    const set = new Set<string>();
    existingGroups.forEach(g => {
      if (g.nicho) {
        // Find existing with same content but original case
        const normalized = g.nicho.trim();
        const existing = Array.from(set).find(s => s.toLowerCase() === normalized.toLowerCase());
        if (!existing) {
          set.add(normalized);
        }
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [existingGroups]);

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
      setFormData(editingGroup);
      setRenterSearch(editingGroup.locatario);
      setNichoSearch(editingGroup.nicho);
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
      
      const normalizedNicho = niches.find(n => n.toLowerCase() === nichoSearch.trim().toLowerCase()) || nichoSearch.trim();
      let finalLocatario = renterSearch.trim();

      const finalData = { ...formData, nicho: normalizedNicho, locatario: finalLocatario };
      
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

  const filteredNiches = niches.filter(n => 
    n.toLowerCase().includes(nichoSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form id="group-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Informações do Grupo</h3>
              
              <FormField label="Nome do Grupo" icon={Type}>
                <input 
                  type="text" 
                  required
                  value={formData.nome_grupo}
                  onChange={e => setFormData({...formData, nome_grupo: e.target.value})}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                  placeholder="Ex: Vagas ABC"
                />
              </FormField>

              <FormField label="Link do Grupo" icon={Link}>
                <input 
                  type="url" 
                  value={formData.link_grupo}
                  onChange={e => {
                    const link = e.target.value;
                    setFormData({...formData, link_grupo: link, group_id: extractGroupId(link)});
                  }}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                  placeholder="facebook.com/groups/..."
                />
              </FormField>

              {formData.group_id && (
                <div className="px-4 py-2 bg-blue-50 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Código (ID)</span>
                  <span className="text-[10px] font-mono font-bold text-blue-700">{formData.group_id}</span>
                </div>
              )}

              {!isSaving && duplicateGroup && (
                <div className="px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                  <div className="text-[10px]">
                    <p className="font-bold text-orange-900 leading-tight">Link já cadastrado!</p>
                    <p className="text-orange-700 mt-0.5">Este código de grupo já pertence ao grupo: <span className="font-bold underline">{duplicateGroup.nome_grupo}</span></p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <FormField label="Nicho" icon={Search}>
                    <input 
                      type="text" 
                      required
                      value={nichoSearch}
                      onChange={e => {
                        setNichoSearch(e.target.value);
                        setFormData({...formData, nicho: e.target.value});
                        setShowNichoSuggestions(true);
                      }}
                      onFocus={() => setShowNichoSuggestions(true)}
                      className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium capitalize"
                      placeholder="Ex: Empregos"
                    />
                  </FormField>

                  <AnimatePresence>
                    {showNichoSuggestions && filteredNiches.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {filteredNiches.map((nicho, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectNicho(nicho)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex flex-col capitalize"
                          >
                            <span className="text-sm font-bold text-gray-800">{nicho}</span>
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
                    value={formData.quantidade_membros}
                    onChange={e => setFormData({...formData, quantidade_membros: parseInt(e.target.value) || 0})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                    placeholder="0"
                  />
                </FormField>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Status</label>
                <div className="flex gap-2">
                  {(['Disponível', 'Alugado'] as GroupStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={cn(
                        "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                        formData.status === s 
                          ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-100" 
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Perfil Compartilhando</label>
                <div className="flex gap-2">
                  {(['Ativo', 'Inativo'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, perfil_compartilhando: s})}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl border-2 text-[11px] font-bold transition-all",
                        formData.perfil_compartilhando === s 
                          ? (s === 'Ativo' ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-100" :
                             "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100")
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Renter Info */}
            <div className={cn("space-y-4", formData.status === 'Disponível' && "opacity-50 pointer-events-none")}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Informações da Locação</h3>
              
              <div className="relative">
                <FormField label="Locatário" icon={User}>
                  <input 
                    type="text" 
                    value={renterSearch}
                    onChange={e => {
                      setRenterSearch(e.target.value);
                      setFormData({...formData, locatario: e.target.value});
                      setShowRenterSuggestions(true);
                    }}
                    onFocus={() => setShowRenterSuggestions(true)}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                    placeholder="Nome completo"
                  />
                </FormField>

                <AnimatePresence>
                  {showRenterSuggestions && filteredRenters.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto"
                    >
                      {filteredRenters.map((renter, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectRenter(renter)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex flex-col"
                        >
                          <span className="text-sm font-bold text-gray-800">{renter.nome}</span>
                          <span className="text-xs text-gray-400">{renter.whatsapp}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <FormField label="WhatsApp" icon={Phone}>
                <input 
                  type="text" 
                  value={formData.whatsapp}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                  placeholder="(00) 00000-0000"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Início" icon={Calendar}>
                  <input 
                    type="date" 
                    value={formData.data_inicio}
                    onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                  />
                </FormField>
                <FormField label="Vencimento" icon={Calendar}>
                  <input 
                    type="date" 
                    value={formData.data_vencimento}
                    onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                    className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                  />
                </FormField>
              </div>

                <div className="relative">
                  <FormField label="Valor Mensal" icon={DollarSign}>
                    <input 
                      type="number" 
                      value={formData.valor || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({...formData, valor: val});
                        setShowValorSuggestions(true);
                      }}
                      onFocus={() => setShowValorSuggestions(true)}
                      className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium font-mono"
                      placeholder="0,00"
                    />
                  </FormField>

                  <AnimatePresence>
                    {showValorSuggestions && commonValores.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto"
                      >
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 italic text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Valores Frequentes
                        </div>
                        {commonValores.filter(v => formData.valor === 0 || v.toString().includes(formData.valor?.toString() || '')).map((v, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectValor(v)}
                            className={cn(
                              "w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 font-mono text-sm font-bold transition-colors",
                              formData.valor === v ? "text-green-600 bg-green-50/50" : "text-gray-700"
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
            <FormField label="Observações" icon={FileText}>
              <textarea 
                rows={3}
                value={formData.observacoes}
                onChange={e => setFormData({...formData, observacoes: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium resize-none"
                placeholder="Detalhes adicionais..."
              />
            </FormField>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="group-form"
            disabled={isSaving}
            className={cn(
              "flex-[2] py-3 px-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
              isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 shadow-green-100"
            )}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
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
      <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block transition-colors group-focus-within:text-green-600">
        {label}
      </label>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent transition-all group-focus-within:border-green-100 group-focus-within:bg-white">
        <Icon className="w-5 h-5 text-gray-400" />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
