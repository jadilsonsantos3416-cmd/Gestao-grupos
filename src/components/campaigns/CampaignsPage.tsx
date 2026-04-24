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
  Link2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CampaignForm } from './CampaignForm';

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
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50/50 rounded-bl-[8rem] flex items-center justify-center -mr-16 -mt-16">
          <Megaphone className="w-24 h-24 text-blue-200 transform -rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">CAMPANHAS</h1>
              <p className="text-gray-500 font-medium">Links curtos, neutros e rastreáveis para seus grupos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <StatCard label="Total" value={stats.total} icon={History} color="text-gray-600" bg="bg-gray-50" />
            <StatCard label="Ativas" value={stats.ativas} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
            <StatCard label="Cliques" value={stats.cliques} icon={MousePointerClick} color="text-blue-600" bg="bg-blue-50" />
            <StatCard 
              label="TOP Campanha" 
              value={stats.top?.cliques || 0} 
              subValue={stats.top?.nome_campanha || 'Nenhuma'} 
              icon={Zap} 
              color="text-amber-600" 
              bg="bg-amber-50" 
            />
          </div>
        </div>
      </section>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Buscar por nome ou slug..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm focus:ring-0 focus:border-blue-200 font-medium transition-all"
            />
          </div>
          
          <div className="flex gap-2">
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
          className="px-8 py-4 bg-blue-600 text-white font-black rounded-3xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-wider text-sm"
        >
          <Plus className="w-5 h-5" />
          Nova Campanha
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Campanha</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Curto</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliques</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCampaigns.map((camp) => {
                const OriginIcon = getOriginIcon(camp.origem);
                return (
                  <motion.tr 
                    layout
                    key={camp.id} 
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-6 font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{camp.nome_campanha}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {camp.grupo_nome || 'Sem grupo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        <OriginIcon className="w-3.5 h-3.5" />
                        {camp.origem}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                          {camp.link_curto.split('://')[1]}
                        </code>
                        <button 
                          onClick={() => copyToClipboard(camp.link_curto, camp.id)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            copySuccess === camp.id ? "bg-green-100 text-green-600" : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          )}
                        >
                          {copySuccess === camp.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-black text-gray-900">{camp.cliques || 0}</span>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-blue-500 uppercase">
                          <History className="w-2.5 h-2.5" />
                          Cliques
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                        camp.status === 'Ativa' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        <button 
                          onClick={() => {
                            setEditingCampaign(camp);
                            setIsFormOpen(true);
                          }}
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-blue-600 transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <button 
                            onClick={() => setDeletingId(deletingId === camp.id ? null : camp.id)}
                            className={cn(
                              "p-2 rounded-xl transition-all active:scale-95",
                              deletingId === camp.id ? "bg-red-50 text-red-600 shadow-inner" : "text-gray-400 hover:bg-white hover:shadow-sm hover:text-red-600"
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
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute right-0 bottom-full mb-2 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 min-w-[140px] text-center"
                                >
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Remover Campanha?</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button 
                                      onClick={async () => {
                                        const result = await deleteCampaign(camp.id);
                                        if (!result?.success) {
                                          alert('Erro ao excluir. Tente novamente.');
                                        }
                                        setDeletingId(null);
                                      }}
                                      className="py-2 bg-red-600 text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition-colors uppercase"
                                    >
                                      Sim
                                    </button>
                                    <button 
                                      onClick={() => setDeletingId(null)}
                                      className="py-2 bg-gray-50 border border-gray-100 text-gray-600 text-[10px] font-black rounded-xl hover:bg-gray-100 transition-colors uppercase"
                                    >
                                      Não
                                    </button>
                                  </div>
                                  <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-white border-r border-b border-gray-100 rotate-45" />
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
          <div className="py-20 text-center">
            <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Nenhuma campanha encontrada</p>
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
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, color, bg }: any) {
  return (
    <div className={cn("p-6 rounded-3xl border border-gray-100 shadow-sm", bg)}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={cn("w-5 h-5", color)} />
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={cn("text-2xl font-black", color)}>{value}</span>
        {subValue && <span className="text-[10px] font-bold text-gray-400 truncate">{subValue}</span>}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }: any) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-[2rem] font-bold text-sm text-gray-700 hover:border-blue-200 transition-all shadow-sm">
      <Filter className="w-4 h-4 text-gray-400" />
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}:</span>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border-0 focus:ring-0 p-0 text-[10px] font-black uppercase tracking-widest text-blue-600"
      >
        {options.map((opt: any) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
