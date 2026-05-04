import React, { useState, useMemo } from 'react';
import { Group } from '@/src/types';
import { Search, Image as ImageIcon, Save, CheckCircle2, AlertCircle, Loader2, Filter, X, ExternalLink } from 'lucide-react';
import { cn, formatNumber } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ThumbnailManagerProps {
  groups: Group[];
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
}

export function ThumbnailManager({ groups, updateGroup }: ThumbnailManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [nichoFilter, setNichoFilter] = useState('Todos');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tempUrls, setTempUrls] = useState<Record<string, string>>({});

  const allNiches = useMemo(() => {
    const niches = new Set<string>();
    groups.forEach(g => {
      if (g.nicho) niches.add(g.nicho);
    });
    return ['Todos', ...Array.from(niches).sort()];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchesSearch = 
        (g.nome_grupo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.nicho || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.link_grupo || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesNicho = nichoFilter === 'Todos' || g.nicho === nichoFilter;
      
      return matchesSearch && matchesNicho;
    });
  }, [groups, searchTerm, nichoFilter]);

  const handleSave = async (group: Group) => {
    const url = tempUrls[group.id] !== undefined ? tempUrls[group.id] : (group.thumbnail_grupo || '');
    
    // Simple validation if not empty
    if (url && !url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)/i) && !url.startsWith('data:image')) {
       // Just a warning, but we still allow it as it might be a dynamic image URL
    }

    setSavingId(group.id);
    try {
      await updateGroup(group.id, {
        thumbnail_grupo: url,
        atualizado_em: new Date().toISOString()
      });
      setToast({ message: "Miniatura salva com sucesso!", type: 'success' });
      // Clear temp url
      const newTemp = { ...tempUrls };
      delete newTemp[group.id];
      setTempUrls(newTemp);
    } catch (error) {
      console.error("Erro ao salvar miniatura:", error);
      setToast({ message: "Erro ao salvar miniatura", type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const GroupThumbnailPreview = ({ group, currentUrl }: { group: Group, currentUrl: string }) => {
    const [hasError, setHasError] = useState(false);
    
    // Reset error when URL changes
    React.useEffect(() => {
      setHasError(false);
    }, [currentUrl]);

    if (currentUrl && !hasError) {
      return (
        <div className="w-[80px] h-[80px] rounded-2xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center relative group">
          <img 
            src={currentUrl} 
            alt={group.nome_grupo || ''} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
          {hasError && (
             <div className="absolute inset-0 bg-rose-50/90 flex flex-col items-center justify-center p-2 text-center">
                <AlertCircle className="w-4 h-4 text-rose-500 mb-1" />
                <span className="text-[8px] font-bold text-rose-600 leading-tight">Imagem não carregou</span>
             </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-[80px] h-[80px] rounded-2xl bg-emerald-50 text-primary font-black text-2xl flex items-center justify-center uppercase shrink-0 border border-emerald-100 shadow-sm">
        {(group.nome_grupo || 'G')[0]}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-primary" />
            Miniaturas dos Grupos
          </h2>
          <p className="text-slate-500 font-medium mt-1">Adicione imagens manualmente para identificar seus grupos mais rápido.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/40 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar grupo por nome, nicho ou link..."
            className="w-full bg-slate-50 border-0 pl-12 pr-4 py-4 rounded-2xl font-bold text-sm text-slate-600 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-50 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-slate-300 w-5 h-5 ml-2 hidden md:block" />
          <select
            value={nichoFilter}
            onChange={e => setNichoFilter(e.target.value)}
            className="w-full md:w-48 bg-slate-50 border-0 px-4 py-4 rounded-2xl font-bold text-sm text-slate-600 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
          >
            {allNiches.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Groups List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredGroups.map(group => {
            const currentUrl = tempUrls[group.id] !== undefined ? tempUrls[group.id] : (group.thumbnail_grupo || '');
            const isModified = tempUrls[group.id] !== undefined && tempUrls[group.id] !== (group.thumbnail_grupo || '');
            
            return (
              <motion.div
                layout
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/40 group hover:border-blue-100 transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  <GroupThumbnailPreview group={group} currentUrl={currentUrl} />
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-lg font-black text-slate-900 truncate" title={group.nome_grupo}>
                            {group.nome_grupo}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-50">
                              {group.nicho || 'Geral'}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                              {formatNumber(group.quantidade_membros || 0)} Membros
                            </span>
                          </div>
                        </div>
                        {group.link_grupo && (
                           <a 
                             href={group.link_grupo} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-2 bg-slate-50 text-slate-300 hover:text-blue-500 rounded-xl transition-all border border-slate-50"
                           >
                             <ExternalLink className="w-4 h-4" />
                           </a>
                        )}
                      </div>

                      <div className="mt-4 relative">
                        <input
                          type="url"
                          placeholder="Colar URL da imagem (jpg, png...)"
                          className="w-full bg-slate-50 border border-slate-100 pl-4 pr-10 py-3 rounded-xl font-bold text-xs text-slate-500 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all"
                          value={currentUrl}
                          onChange={e => setTempUrls({ ...tempUrls, [group.id]: e.target.value })}
                        />
                        {currentUrl && (
                          <button
                            onClick={() => setTempUrls({ ...tempUrls, [group.id]: '' })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-300 italic">
                        {isModified ? "Alterações não salvas" : (group.thumbnail_grupo ? "Miniatura definida" : "Usando inicial")}
                      </span>
                      <button
                        onClick={() => handleSave(group)}
                        disabled={savingId === group.id || !isModified}
                        className={cn(
                          "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                          isModified 
                            ? "bg-primary text-white shadow-lg shadow-green-100 hover:bg-accent" 
                            : "bg-slate-50 text-slate-300 cursor-not-allowed"
                        )}
                      >
                        {savingId === group.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredGroups.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Nenhum grupo encontrado</h3>
            <p className="text-slate-400 font-bold max-w-sm">Tente ajustar seus filtros para encontrar o que procura.</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 min-w-[300px]"
          >
            {toast.type === 'success' ? (
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
            )}
            <span className="font-extrabold text-sm flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
