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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form id="campaign-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <FormField label="Nome da Campanha" icon={Type}>
              <input 
                type="text" 
                required
                value={formData.nome_campanha || ''}
                onChange={e => setFormData({...formData, nome_campanha: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                placeholder="Ex: Ofertas de Verão - Smartwatch"
              />
            </FormField>

            <FormField label="Link Original (Destino)" icon={Link}>
              <input 
                type="url" 
                required
                value={formData.link_original || ''}
                onChange={e => setFormData({...formData, link_original: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                placeholder="https://shopee.com.br/produto/..."
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase ml-1">Origem</label>
                 <div className="grid grid-cols-2 gap-2">
                   {origins.map(origin => (
                     <button
                       key={origin.value}
                       type="button"
                       onClick={() => setFormData({...formData, origem: origin.value})}
                       className={cn(
                         "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-bold uppercase",
                         formData.origem === origin.value 
                           ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-100" 
                           : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                       )}
                     >
                       <origin.icon className="w-3.5 h-3.5" />
                       {origin.value}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase ml-1">Grupo Relacionado</label>
                 <div className="relative">
                   <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                     <Briefcase className="w-4 h-4 text-gray-400" />
                     <select 
                       value={formData.grupo_id}
                       onChange={e => {
                         const group = groups.find(g => g.id === e.target.value);
                         setFormData({...formData, grupo_id: e.target.value, grupo_nome: group?.nome_grupo || ''});
                       }}
                       className="w-full bg-transparent border-0 focus:ring-0 p-0 text-[10px] font-bold uppercase text-gray-700"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Status</label>
                <div className="flex gap-2">
                  {(['Ativa', 'Inativa'] as CampaignStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={cn(
                        "flex-1 py-2 rounded-xl border transition-all text-[10px] font-bold uppercase",
                        formData.status === s 
                          ? (s === 'Ativa' ? "bg-green-600 border-green-600 text-white shadow-md shadow-green-100" : "bg-red-600 border-red-600 text-white shadow-md shadow-red-100")
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <FormField label="Slug Personalizado (Opcional)" icon={Zap}>
                 <input 
                   type="text" 
                   value={formData.slug || ''}
                   readOnly={!!editingCampaign}
                   onChange={e => setFormData({...formData, slug: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
                   className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium"
                   placeholder={editingCampaign ? formData.slug : "Aleatório"}
                 />
              </FormField>
            </div>

            <FormField label="Observações" icon={FileText}>
              <textarea 
                rows={3}
                value={formData.observacoes || ''}
                onChange={e => setFormData({...formData, observacoes: e.target.value})}
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium resize-none uppercase"
                placeholder="Detalhes adicionais da campanha..."
              />
            </FormField>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="campaign-form"
            disabled={isSaving}
            className={cn(
              "flex-[2] py-3 px-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
              isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 shadow-green-100 shadow-lg"
            )}
          >
            {isSaving ? "Salvando..." : editingCampaign ? "Atualizar Campanha" : "Criar Campanha Neutra"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FormField({ label, icon: Icon, children, readOnly }: any) {
  return (
    <div className="relative group">
      <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block transition-colors group-focus-within:text-green-600">
        {label}
      </label>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all group-focus-within:border-green-100 group-focus-within:bg-white",
        readOnly ? "bg-gray-100 border-transparent opacity-70" : "bg-gray-50 border-transparent"
      )}>
        <Icon className={cn("w-5 h-5", readOnly ? "text-gray-300" : "text-gray-400")} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
