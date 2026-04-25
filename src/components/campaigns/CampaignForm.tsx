import React, { useState, useEffect } from 'react';
import { Campaign, CampaignStatus, CampaignOrigin, Group } from '@/src/types';
import { X, Link, Type, Briefcase, FileText, AlertCircle, ShoppingBag, Store, Zap, Globe, MoreHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

interface CampaignFormProps {
  onClose: () => void;
  onSave: (campaign: any) => Promise<void>;
  editingCampaign?: Campaign | null;
  groups: Group[];
}

export function CampaignForm({ onClose, onSave, editingCampaign, groups }: CampaignFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Campaign>>({
    nome_campanha: '',
    link_original: '',
    origem: 'Shopee' as CampaignOrigin,
    grupo_id: '',
    grupo_nome: '',
    status: 'Ativa' as CampaignStatus,
    observacoes: '',
  });

  useEffect(() => {
    if (editingCampaign) {
      setFormData(editingCampaign);
    }
  }, [editingCampaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setError(null);
    setIsSaving(true);
    
    try {
      if (!formData.nome_campanha?.trim()) throw new Error("Nome da campanha é obrigatório.");
      if (!formData.link_original?.trim()) throw new Error("Link original é obrigatório.");
      
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar a campanha.");
    } finally {
      setIsSaving(false);
    }
  };

  const origins: { value: CampaignOrigin; icon: any }[] = [
    { value: 'Shopee', icon: ShoppingBag },
    { value: 'Mercado Livre', icon: Store },
    { value: 'Hotmart', icon: Zap },
    { value: 'Outro', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        <div className="px-6 md:px-10 py-4 md:py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg md:text-2xl font-black text-slate-900 leading-none">
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
            </h2>
            <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 md:mt-2">Configure seu link redirecionador</p>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
            <X className="w-5 h-5 md:w-6 md:h-6 text-slate-300 group-hover:text-slate-600" />
          </button>
        </div>

        <form id="campaign-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 no-scrollbar">
          {error && (
            <div className="p-4 md:p-5 bg-rose-50 border border-rose-100 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center gap-3 md:gap-4 animate-shake">
              <AlertCircle className="w-4 h-4 md:w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-rose-800 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-6 md:space-y-8">
            <FormField label="Nome da Campanha" icon={Type}>
              <input 
                type="text" 
                required
                value={formData.nome_campanha || ''}
                onChange={e => setFormData({...formData, nome_campanha: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs md:text-sm font-black text-slate-700 placeholder:text-slate-300 placeholder:font-bold"
                placeholder="Ex: Ofertas de Verão"
              />
            </FormField>

            <FormField label="URL Original" icon={Link}>
              <input 
                type="url" 
                required
                value={formData.link_original || ''}
                onChange={e => setFormData({...formData, link_original: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-[10px] md:text-xs font-bold text-blue-600 placeholder:text-slate-300"
                placeholder="https://shopee.com.br/..."
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origem do Link</label>
                 <div className="grid grid-cols-2 gap-2">
                   {origins.map(origin => (
                     <button
                       key={origin.value}
                       type="button"
                       onClick={() => setFormData({...formData, origem: origin.value})}
                       className={cn(
                         "flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 rounded-xl border transition-all text-[8px] md:text-[9px] font-black uppercase tracking-tighter",
                         formData.origem === origin.value 
                           ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200" 
                           : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                       )}
                     >
                       <origin.icon className="w-3 h-3" />
                       <span className="truncate">{origin.value}</span>
                     </button>
                   ))}
                 </div>
               </div>

               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Grupo</label>
                 <div className="relative">
                   <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 rounded-xl border border-slate-100">
                     <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300" />
                     <select 
                       value={formData.grupo_id}
                       onChange={e => {
                         const group = groups.find(g => g.id === e.target.value);
                         setFormData({...formData, grupo_id: e.target.value, grupo_nome: group?.nome_grupo || ''});
                       }}
                       className="w-full bg-transparent border-0 focus:ring-0 p-0 text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer"
                     >
                       <option value="">Nenhum</option>
                       {groups.map(g => (
                         <option key={g.id} value={g.id}>{g.nome_grupo}</option>
                       ))}
                     </select>
                   </div>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <div className="flex gap-2">
                  {(['Ativa', 'Inativa'] as CampaignStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={cn(
                        "flex-1 py-2.5 md:py-3 rounded-xl border font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all",
                        formData.status === s 
                          ? (s === 'Ativa' ? "bg-primary border-primary text-white shadow-xl shadow-green-50" : "bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-50")
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <FormField label="URL Curta" icon={Zap}>
                 <input 
                   type="text" 
                   value={formData.slug || ''}
                   readOnly={!!editingCampaign}
                   onChange={e => setFormData({...formData, slug: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
                   className="w-full bg-transparent border-0 focus:ring-0 p-0 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-primary placeholder:text-slate-200"
                   placeholder={editingCampaign ? formData.slug : "Automático"}
                 />
              </FormField>
            </div>


            <FormField label="Observações de Copy" icon={FileText}>
              <textarea 
                rows={3}
                value={formData.observacoes || ''}
                onChange={e => setFormData({...formData, observacoes: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-slate-600 resize-none placeholder:text-slate-200"
                placeholder="Ex: Preço promocional até domingo..."
              />
            </FormField>
          </div>
        </form>

        <div className="px-6 md:px-10 py-5 md:py-8 border-t border-slate-50 bg-slate-50 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 md:py-5 px-4 md:px-6 bg-white border border-slate-200 text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest rounded-[2rem] hover:bg-slate-50 hover:text-slate-600 transition-all"
          >
            Voltar
          </button>
          <button 
            type="submit"
            form="campaign-form"
            disabled={isSaving}
            className={cn(
              "flex-[2] py-3.5 md:py-5 px-4 md:px-6 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest rounded-[2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3",
              isSaving ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-accent shadow-green-200"
            )}
          >
            {isSaving ? "Gravando..." : editingCampaign ? "Atualizar" : "Criar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FormField({ label, icon: Icon, children, readOnly }: any) {
  return (
    <div className="relative group">
      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 md:mb-1.5 block transition-colors group-focus-within:text-primary">
        {label}
      </label>
      <div className={cn(
        "flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 transition-all group-focus-within:border-green-100 group-focus-within:bg-white group-focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        readOnly ? "bg-slate-100 border-transparent opacity-70" : "bg-slate-50/50 border-transparent"
      )}>
        <Icon className={cn("w-4 h-4 md:w-5 md:h-5 transition-colors", readOnly ? "text-slate-200" : "text-slate-300 group-focus-within:text-primary")} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
