import React, { useState, useMemo } from 'react';
import { Campaign, Group } from '@/src/types';
import { useCampaigns } from '@/src/hooks/useCampaigns';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Copy, 
  ExternalLink, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  MousePointerClick, 
  History,
  Store,
  Zap,
  ShoppingBag,
  Globe,
  Filter,
  CheckCircle2,
  XCircle,
  Link2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CampaignForm } from './CampaignForm';
import { CopyGeneratorModal } from './CopyGeneratorModal';

interface CampaignsPageProps {
  groups: Group[];
}

export function CampaignsPage({ groups }: CampaignsPageProps) {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [selectedCampaignForCopy, setSelectedCampaignForCopy] = useState<Campaign | null>(null);
  
  const [filters, setFilters] = useState({
    origem: 'All',
    status: 'All',
    grupo: 'All'
  });

  const stats = useMemo(() => {
    const total = campaigns.length;
    const ativas = campaigns.filter(c => c.status === 'Ativa').length;
    const cliques = campaigns.reduce((acc, c) => acc + (c.cliques || 0), 0);
    const top = [...campaigns].sort((a, b) => (b.cliques || 0) - (a.cliques || 0))[0];
    
    return { total, ativas, cliques, top };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.nome_campanha.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrigem = filters.origem === 'All' || c.origem === filters.origem;
      const matchesStatus = filters.status === 'All' || c.status === filters.status;
      const matchesGrupo = filters.grupo === 'All' || c.grupo_id === filters.grupo;
      
      return matchesSearch && matchesOrigem && matchesStatus && matchesGrupo;
    }).sort((a, b) => (b.cliques || 0) - (a.cliques || 0));
  }, [campaigns, searchTerm, filters]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'Shopee': return ShoppingBag;
      case 'Mercado Livre': return Store;
      case 'Hotmart': return Zap;
      default: return Globe;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <section className="bg-white p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/30 rounded-bl-[10rem] flex items-center justify-center -mr-20 -mt-20">
          <Megaphone className="w-32 h-32 text-blue-100 transform -rotate-12 opacity-50" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 md:gap-5 mb-4 md:mb-6">
            <div className="p-2 md:p-4 bg-blue-600 rounded-2xl md:rounded-3xl shadow-xl shadow-blue-100">
              <Megaphone className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight uppercase">Minhas Campanhas</h1>
              <p className="text-slate-500 font-medium uppercase tracking-widest text-[8px] md:text-[9px] mt-0.5 md:mt-1">Links curtos e performance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-10">
            <StatCard label="Total" value={stats.total} icon={History} color="text-slate-600" bg="bg-slate-50" />
            <StatCard label="Ativas" value={stats.ativas} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Cliques" value={stats.cliques} icon={MousePointerClick} color="text-blue-600" bg="bg-blue-50" />
            <StatCard 
              label="TOP" 
              value={stats.top?.cliques || 0} 
              subValue={stats.top?.nome_campanha || 'Sem dados'} 
              icon={Zap} 
              color="text-amber-600" 
              bg="bg-amber-50" 
            />
          </div>
        </div>
      </section>

      {/* Control Bar */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
          <div className="relative flex-1 group min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Pesquise por nome ou slug..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 font-bold text-slate-600 placeholder:text-slate-300 transition-all"
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            <FilterSelect 
              value={filters.origem} 
              onChange={v => setFilters({...filters, origem: v})} 
              options={['All', 'Shopee', 'Mercado Livre', 'Hotmart', 'Outro']} 
              label="Origem"
            />
            <FilterSelect 
              value={filters.status} 
              onChange={v => setFilters({...filters, status: v})} 
              options={['All', 'Ativa', 'Inativa']} 
              label="Status"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingCampaign(null);
            setIsFormOpen(true);
          }}
          className="w-full xl:w-auto px-6 py-3.5 md:px-10 md:py-5 bg-blue-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 md:gap-4 uppercase tracking-widest text-[10px] md:text-xs"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Nova Campanha
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Campanha</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Origem</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Link Curto</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliques</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCampaigns.map((camp) => {
                const OriginIcon = getOriginIcon(camp.origem);
                return (
                  <motion.tr 
                    layout
                    key={camp.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-8">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-base">{camp.nome_campanha}</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Globe className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {camp.grupo_nome || 'Lote de grupos'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        <OriginIcon className="w-3.5 h-3.5" />
                        {camp.origem}
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="group/link relative">
                          <code className="text-[11px] font-mono font-bold bg-white text-blue-600 px-4 py-2 rounded-xl border border-slate-100 shadow-sm group-hover/link:border-blue-200 group-hover/link:bg-blue-50 transition-all">
                            /l/{camp.slug}
                          </code>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(`https://gestao-grupos.vercel.app/l/${camp.slug}`, camp.id)}
                          className={cn(
                            "p-3 rounded-xl transition-all shadow-sm",
                            copySuccess === camp.id ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-white text-slate-400 hover:text-blue-600 border border-slate-100 hover:border-blue-100"
                          )}
                        >
                          {copySuccess === camp.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-slate-900">{camp.cliques || 0}</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Cliques Acumulados</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <span className={cn(
                        "text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm",
                        camp.status === 'Ativa' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            setSelectedCampaignForCopy(camp);
                            setIsCopyModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-[10px] uppercase tracking-widest shadow-sm"
                          title="Gerar Textos"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="hidden xl:inline">Copy AI</span>
                        </button>

                        <button 
                          onClick={() => {
                            setEditingCampaign(camp);
                            setIsFormOpen(true);
                          }}
                          className="p-3 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <button 
                            onClick={() => setDeletingId(deletingId === camp.id ? null : camp.id)}
                            className={cn(
                              "p-3 rounded-2xl transition-all shadow-sm",
                              deletingId === camp.id ? "bg-rose-500 text-white" : "bg-white border border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                            )}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <AnimatePresence>
                            {deletingId === camp.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setDeletingId(null)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                  className="absolute right-0 bottom-full mb-4 z-20 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-5 min-w-[200px] text-center"
                                >
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Confirmar exclusão?</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button 
                                      onClick={async () => {
                                        const result = await deleteCampaign(camp.id);
                                        if (!result?.success) {
                                          alert('Erro ao excluir. Tente novamente.');
                                        }
                                        setDeletingId(null);
                                      }}
                                      className="py-3 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-rose-700 transition-colors uppercase tracking-widest shadow-lg shadow-rose-100"
                                    >
                                      Sim
                                    </button>
                                    <button 
                                      onClick={() => setDeletingId(null)}
                                      className="py-3 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest"
                                    >
                                      Não
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCampaigns.length === 0 && (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Megaphone className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Nenhuma campanha encontrada</p>
            <p className="text-slate-300 text-[10px] mt-2 font-bold italic">Tente mudar seus filtros de busca</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <CampaignForm 
            groups={groups}
            onClose={() => setIsFormOpen(false)}
            onSave={async (data) => {
              if (editingCampaign) {
                await updateCampaign(editingCampaign.id, data);
              } else {
                await addCampaign(data);
              }
            }}
            editingCampaign={editingCampaign}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCopyModalOpen && selectedCampaignForCopy && (
          <CopyGeneratorModal 
            campaign={selectedCampaignForCopy}
            group={groups.find(g => g.id === selectedCampaignForCopy.grupo_id)}
            onClose={() => {
              setIsCopyModalOpen(false);
              setSelectedCampaignForCopy(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, color, bg }: any) {
  return (
    <div className={cn("p-3 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm", bg)}>
      <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
        <Icon className={cn("w-3.5 h-3.5 md:w-5 md:h-5", color)} />
        <span className="text-[8px] md:text-[9px] font-bold uppercase text-gray-400 tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={cn("text-lg md:text-xl font-bold", color)}>{value}</span>
        {subValue && <span className="text-[8px] md:text-[9px] font-medium text-gray-400 truncate mt-0.5">{subValue}</span>}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }: any) {
  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-4 bg-white border border-gray-100 rounded-[2rem] font-bold text-xs md:text-sm text-gray-700 hover:border-blue-200 transition-all shadow-sm shrink-0">
      <Filter className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">{label}:</span>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border-0 focus:ring-0 p-0 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-600"
      >
        {options.map((opt: any) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
