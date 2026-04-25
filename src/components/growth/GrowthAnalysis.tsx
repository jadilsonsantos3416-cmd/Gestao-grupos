import React, { useState, useMemo } from 'react';
import { Group, GrowthTier } from '@/src/types';
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  TrendingDown, 
  ChevronDown, 
  Brain, 
  Loader2,
  Trophy,
  Activity,
  AlertCircle,
  LayoutGrid,
  Info,
  ExternalLink,
  Target,
  UserCheck,
  ShoppingBag,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { cn, formatNumber, ensureAbsoluteUrl } from '@/src/lib/utils';
import { analyzeGroupsGrowth } from '@/src/services/aiService';
import { motion, AnimatePresence } from 'motion/react';

interface GrowthAnalysisProps {
  groups: Group[];
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
}

export function GrowthAnalysis({ groups, updateGroup }: GrowthAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<GrowthTier | 'All'>('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'autopilot' | 'ai'>('autopilot');
  const [selectedAutopilotCategory, setSelectedAutopilotCategory] = useState<string | null>(null);

  // --- Local Autopilot Analysis Logic ---
  const priorityNiches = ["Evangélico", "Receitas", "Musa", "Beleza / Cabelo", "Agro / Notícias"];

  const analyzedGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map(group => {
      if (!group) return null;
      let score = 0;
      const membros = Number(group.quantidade_membros) || 0;
      
      // Score Rules
      if (membros >= 30000) score += 3;
      else if (membros >= 10000) score += 2;
      
      if ((group.perfil_compartilhando || 'Inativo') === 'Ativo') score += 3;
      if ((group.uso_shopee || 'Inativo') === 'Ativo') score += 3;
      
      const currentNicho = (group.nicho || 'Geral').toLowerCase();
      if (priorityNiches.some(n => currentNicho.includes(n.toLowerCase()))) {
        score += 2;
      }
      
      if ((group.status || 'Disponível') === 'Disponível') score += 1;

      // Potential Classification
      let potential: GrowthTier = 'Low';
      if (score >= 8) potential = 'High';
      else if (score >= 4) potential = 'Medium';

      // Recommended Action
      let action = "Revisar depois";
      const isPerfilAtivo = (group.perfil_compartilhando || 'Inativo') === 'Ativo';
      const isShopeeAtivo = (group.uso_shopee || 'Inativo') === 'Ativo';

      if (isPerfilAtivo && isShopeeAtivo) {
        action = "Postar link da Shopee";
      } else if (!isPerfilAtivo && membros >= 30000) {
        action = "Ativar perfil compartilhando";
      } else if (!isShopeeAtivo && isPerfilAtivo) {
        action = "Ativar uso para Shopee";
      }

      return {
        ...group,
        localScore: score,
        localPotential: potential,
        recommendedAction: action
      };
    }).filter(g => g !== null) as any[];
  }, [groups]);

  // Autopilot Categories
  const autopilotCategories = useMemo(() => {
    const postarAgora = analyzedGroups.filter(g => 
      g.perfil_compartilhando === 'Ativo' && 
      g.uso_shopee === 'Ativo' && 
      (Number(g.quantidade_membros) || 0) >= 30000
    );
    
    const ativarPerfil = analyzedGroups.filter(g => 
      (g.perfil_compartilhando === 'Inativo' || !g.perfil_compartilhando) && 
      (Number(g.quantidade_membros) || 0) >= 30000
    );
    
    const ativarShopee = analyzedGroups.filter(g => 
      (g.uso_shopee === 'Inativo' || !g.uso_shopee) && 
      (Number(g.quantidade_membros) || 0) >= 30000
    );
    
    const oportunidades = analyzedGroups.filter(g => 
      (Number(g.quantidade_membros) || 0) >= 30000 && 
      g.status === 'Disponível'
    );

    return { postarAgora, ativarPerfil, ativarShopee, oportunidades };
  }, [analyzedGroups]);

  const stats = useMemo(() => {
    const total = analyzedGroups.length;
    const high = analyzedGroups.filter(g => g.localPotential === 'High').length;
    const medium = analyzedGroups.filter(g => g.localPotential === 'Medium').length;
    const low = analyzedGroups.filter(g => g.localPotential === 'Low').length;

    return { total, high, medium, low };
  }, [analyzedGroups]);

  const handleStartAnalysis = async () => {
    if (isAnalyzing) return;
    if (groups.length === 0) {
      alert("Não há grupos cadastrados para analisar.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const results = await analyzeGroupsGrowth(groups);
      
      if (!results || results.length === 0) {
        alert("A IA não retornou resultados para esses grupos. Usando análise automática local.");
        setViewMode('autopilot');
        return;
      }

      let successCount = 0;
      for (const res of results) {
        const groupExists = groups.find(g => g.id === res.groupId);
        if (!groupExists) continue;

        try {
          await updateGroup(res.groupId, {
            growth_tier: res.tier,
            ai_analysis: res.reasoning
          });
          successCount++;
        } catch (err) {
          console.error(`Falha ao atualizar grupo ${res.groupId}:`, err);
        }
      }
      
      if (successCount > 0) {
        alert(`Análise concluída com sucesso! ${successCount} grupos categorizados.`);
        setViewMode('ai');
      }
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      alert("Houve um erro na análise de IA. Usando análise automática local.");
      setViewMode('autopilot');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredGroups = useMemo(() => {
    let result = viewMode === 'ai' 
      ? groups.filter(g => g.growth_tier) 
      : analyzedGroups;

    if (viewMode === 'autopilot' && selectedAutopilotCategory) {
      switch (selectedAutopilotCategory) {
        case 'postarAgora': result = autopilotCategories.postarAgora; break;
        case 'ativarPerfil': result = autopilotCategories.ativarPerfil; break;
        case 'ativarShopee': result = autopilotCategories.ativarShopee; break;
        case 'oportunidades': result = autopilotCategories.oportunidades; break;
      }
    } else if (selectedTier !== 'All') {
      result = (result as any[]).filter(g => (viewMode === 'ai' ? g.growth_tier : g.localPotential) === selectedTier);
    }

    // Always sort by members descending
    return [...result].sort((a, b) => (Number(b.quantidade_membros) || 0) - (Number(a.quantidade_membros) || 0));
  }, [viewMode, groups, analyzedGroups, selectedTier, selectedAutopilotCategory, autopilotCategories]);

  const getTierIcon = (tier?: GrowthTier) => {
    switch (tier) {
      case 'High': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'Medium': return <BarChart3 className="w-5 h-5 text-blue-500" />;
      case 'Low': return <TrendingDown className="w-5 h-5 text-gray-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getTierColor = (tier?: GrowthTier) => {
    switch (tier) {
      case 'High': return "bg-green-50 text-green-700 border-green-100";
      case 'Medium': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'Low': return "bg-gray-50 text-gray-600 border-gray-100";
      default: return "bg-purple-50 text-purple-700 border-purple-100";
    }
  };

  const getTierLabel = (tier: GrowthTier | 'All') => {
    switch (tier) {
      case 'High': return "Alto Potencial";
      case 'Medium': return "Capacidade Média";
      case 'Low': return "Baixa Capacidade";
      case 'All': return "Ver Todos";
      default: return tier;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative z-20">
        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
          <div className="absolute right-0 top-0 w-48 h-48 bg-purple-50/50 rounded-bl-[6rem] flex items-center justify-center -mr-12 -mt-12">
            <Brain className="w-20 h-20 text-purple-200" />
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2 flex items-center gap-3">
                Piloto Automático IA
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest">Ativo</span>
              </h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Análise automática local concluída com base nos dados dos seus grupos. Identificamos as melhores ações para hoje.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setViewMode('autopilot')}
                className={cn(
                  "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                  viewMode === 'autopilot' 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                Modo Piloto Automático
              </button>
              <button
                onClick={() => setViewMode('ai')}
                className={cn(
                  "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                  viewMode === 'ai' 
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-100" 
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                Modo Análise Profunda
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Analisado</span>
              <span className="text-2xl font-black text-gray-900 font-mono">{stats.total}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Alto Potencial</span>
              <span className="text-2xl font-black text-gray-900 font-mono">{stats.high}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Médio Potencial</span>
              <span className="text-2xl font-black text-gray-900 font-mono">{stats.medium}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Baixo Potencial</span>
              <span className="text-2xl font-black text-gray-900 font-mono">{stats.low}</span>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className={cn(
                "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                isAnalyzing 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
              )}
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isAnalyzing ? "Analisando..." : "Forçar Nova Análise IA Profunda"}
            </button>

            <div className={cn("relative", isDropdownOpen && "z-50")}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm text-gray-700 hover:border-purple-200 transition-all shadow-sm"
              >
                <LayoutGrid className="w-5 h-5 text-gray-400" />
                {getTierLabel(selectedTier)}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                  >
                    {[ 'All', 'High', 'Medium', 'Low' ].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => {
                          setSelectedTier(tier as any);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
                          selectedTier === tier 
                            ? "bg-purple-50 text-purple-700" 
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {tier === 'All' ? <Trophy className="w-4 h-4" /> : getTierIcon(tier as GrowthTier)}
                        {getTierLabel(tier as any)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Piloto Automático de Hoje Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Piloto Automático de Hoje</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AutopilotCard 
            title="Postar Agora" 
            count={autopilotCategories.postarAgora.length} 
            icon={<Target className="w-6 h-6 text-red-500" />}
            color="red"
            description="Perfis ativos em grupos grandes."
            onClick={() => {
              setSelectedAutopilotCategory(prev => prev === 'postarAgora' ? null : 'postarAgora');
              setSelectedTier('All');
            }}
            isActive={selectedAutopilotCategory === 'postarAgora'}
          />
          <AutopilotCard 
            title="Ativar Perfil" 
            count={autopilotCategories.ativarPerfil.length} 
            icon={<UserCheck className="w-6 h-6 text-blue-500" />}
            color="blue"
            description="Ative o perfil nesses 30k+."
            onClick={() => {
              setSelectedAutopilotCategory(prev => prev === 'ativarPerfil' ? null : 'ativarPerfil');
              setSelectedTier('All');
            }}
            isActive={selectedAutopilotCategory === 'ativarPerfil'}
          />
          <AutopilotCard 
            title="Ativar Shopee" 
            count={autopilotCategories.ativarShopee.length} 
            icon={<ShoppingBag className="w-6 h-6 text-orange-500" />}
            color="orange"
            description="Configure Shopee nesses 30k+."
            onClick={() => {
              setSelectedAutopilotCategory(prev => prev === 'ativarShopee' ? null : 'ativarShopee');
              setSelectedTier('All');
            }}
            isActive={selectedAutopilotCategory === 'ativarShopee'}
          />
          <AutopilotCard 
            title="Oportunidades" 
            count={autopilotCategories.oportunidades.length} 
            icon={<Sparkles className="w-6 h-6 text-green-500" />}
            color="green"
            description="30k+ disponíveis para locação."
            onClick={() => {
              setSelectedAutopilotCategory(prev => prev === 'oportunidades' ? null : 'oportunidades');
              setSelectedTier('All');
            }}
            isActive={selectedAutopilotCategory === 'oportunidades'}
          />
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">Relatório Detalhado de Análise</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {viewMode === 'autopilot' ? 'Análise Automática baseada em Score' : 'Análise Profunda por IA'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupo</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Nicho</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Membros</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Config</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Score</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Potencial</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-gray-400 italic">
                    Nenhum grupo encontrado para estes critérios.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group: any) => (
                  <tr key={group.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors uppercase text-sm line-clamp-1">{group.nome_grupo}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full",
                            group.status === 'Disponível' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {group.status}
                          </span>
                          {group.link_grupo && (
                            <a href={ensureAbsoluteUrl(group.link_grupo)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-mono uppercase">
                              LINK <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-[10px] font-black text-gray-500 bg-white border border-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-widest capitalize">
                        {group.nicho}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-sm font-bold text-gray-900 font-mono">{formatNumber(group.quantidade_membros || 0)}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center border transition-colors",
                          group.perfil_compartilhando === 'Ativo' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center border transition-colors",
                          group.uso_shopee === 'Ativo' ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-sm font-black text-purple-600 font-mono">
                        {viewMode === 'autopilot' ? group.localScore : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        getTierColor(viewMode === 'ai' ? group.growth_tier : group.localPotential)
                      )}>
                        {getTierIcon(viewMode === 'ai' ? group.growth_tier : group.localPotential)}
                        {getTierLabel(viewMode === 'ai' ? group.growth_tier : group.localPotential)}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="relative group/action">
                          <button 
                            className={cn(
                              "text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 uppercase tracking-wide",
                              group.perfil_compartilhando === 'Ativo' && group.uso_shopee === 'Ativo'
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                : "bg-slate-50/50 border-slate-100 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <span className="truncate max-w-[100px]">
                              {viewMode === 'autopilot' ? group.recommendedAction : (group.ai_analysis || "Ver Ações")}
                            </span>
                            <ChevronDown className="w-3 h-3 opacity-30" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover/action:opacity-100 group-hover/action:visible transition-all z-50 p-1.5">
                             <div className="px-2 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                               Status
                             </div>
                             <button
                               onClick={() => updateGroup(group.id, { perfil_compartilhando: group.perfil_compartilhando === 'Ativo' ? 'Inativo' : 'Ativo' })}
                               className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                             >
                               <span className="text-[9px] font-medium text-gray-600 uppercase">Perfil</span>
                               <div className="flex items-center gap-1.5">
                                 <div className={cn("w-1.5 h-1.5 rounded-full", group.perfil_compartilhando === 'Ativo' ? "bg-emerald-500" : "bg-rose-400")} />
                                 <span className={cn(
                                   "text-[8px] font-bold",
                                   group.perfil_compartilhando === 'Ativo' ? "text-emerald-700" : "text-rose-600"
                                 )}>
                                   {group.perfil_compartilhando === 'Ativo' ? 'SIM' : 'NÃO'}
                                 </span>
                               </div>
                             </button>
                             <button
                               onClick={() => updateGroup(group.id, { uso_shopee: group.uso_shopee === 'Ativo' ? 'Inativo' : 'Ativo' })}
                               className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                             >
                               <span className="text-[9px] font-medium text-gray-600 uppercase">Shopee</span>
                               <div className="flex items-center gap-1.5">
                                 <div className={cn("w-1.5 h-1.5 rounded-full", group.uso_shopee === 'Ativo' ? "bg-blue-500" : "bg-slate-300")} />
                                 <span className={cn(
                                   "text-[8px] font-bold",
                                   group.uso_shopee === 'Ativo' ? "text-blue-700" : "text-slate-400"
                                 )}>
                                   {group.uso_shopee === 'Ativo' ? 'SIM' : 'NÃO'}
                                 </span>
                               </div>
                             </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AutopilotCard({ title, count, icon, color, description, onClick, isActive }: any) {
  const colors: any = {
    red: "bg-red-50 border-red-100 group-hover:border-red-200 ring-red-500",
    blue: "bg-blue-50 border-blue-100 group-hover:border-blue-200 ring-blue-500",
    orange: "bg-orange-50 border-orange-100 group-hover:border-orange-200 ring-orange-500",
    green: "bg-green-50 border-green-100 group-hover:border-green-200 ring-green-500"
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left bg-white p-6 rounded-[2rem] border transition-all hover:shadow-lg group relative overflow-hidden",
        colors[color],
        isActive ? "ring-2 border-transparent scale-[1.02] shadow-xl" : "hover:scale-[1.01]"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-3 rounded-2xl shadow-sm transition-colors",
          isActive ? "bg-white" : "bg-white"
        )}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-gray-900 font-mono leading-none">{count}</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Grupos</span>
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="font-black text-gray-900 text-sm uppercase mb-1">{title}</h4>
        <p className={cn(
          "text-[10px] font-medium leading-relaxed",
          isActive ? "text-gray-700" : "text-gray-500"
        )}>
          {description}
        </p>
      </div>
      
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
        </div>
      )}
    </button>
  );
}

