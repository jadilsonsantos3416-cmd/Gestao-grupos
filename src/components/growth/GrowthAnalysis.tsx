import React, { useState } from 'react';
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
  ExternalLink
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

  const handleStartAnalysis = async () => {
    if (isAnalyzing) return;
    if (groups.length === 0) {
      alert("Não há grupos cadastrados para analisar.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      // Only analyze groups that haven't been analyzed or re-analyze everything
      const results = await analyzeGroupsGrowth(groups);
      
      if (!results || results.length === 0) {
        alert("A IA não retornou resultados para esses grupos. Tente novamente mais tarde.");
        return;
      }

      // Update each group in Firestore
      let successCount = 0;
      for (const res of results) {
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
        alert(`Análise concluída! ${successCount} grupos categorizados.`);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Houve um erro na análise de IA. Verifique se a sua chave API está configurada corretamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredGroups = selectedTier === 'All' 
    ? groups.filter(g => g.growth_tier) 
    : groups.filter(g => g.growth_tier === selectedTier);

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
      case 'All': return "Ver Todos Analisados";
      default: return tier;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative">
        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
          <div className="absolute right-0 top-0 w-48 h-48 bg-purple-50/50 rounded-bl-[6rem] flex items-center justify-center -mr-12 -mt-12">
            <Brain className="w-20 h-20 text-purple-200" />
          </div>
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2 flex items-center gap-3">
            Análise de Crescimento IA
            <span className="text-xs font-black bg-purple-100 text-purple-700 px-3 py-1 rounded-full uppercase tracking-widest">Beta</span>
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Nossa Inteligência Artificial analisa o nicho, o nome e a base de membros para identificar quais grupos têm maior potencial de retenção e escalabilidade.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
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
              {isAnalyzing ? "Analisando..." : "Iniciar Nova Análise IA"}
            </button>
            
            {/* Dropdown Menu Style Filter */}
            <div className="relative">
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

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhum grupo analisado ainda</h3>
            <p className="text-gray-400 max-w-xs mt-1">Clique em "Iniciar Nova Análise IA" para categorizar seus grupos.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <motion.div
              layoutId={group.id}
              key={group.id}
              className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-[4rem] -mr-8 -mt-8",
                group.growth_tier === 'High' ? "bg-green-500" : group.growth_tier === 'Medium' ? "bg-blue-500" : "bg-gray-500"
              )} />

              <header className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">{group.nicho}</span>
                  <h4 className="font-bold text-gray-900 leading-tight group-hover:text-purple-600 transition-colors uppercase">{group.nome_grupo}</h4>
                  {group.link_grupo && (
                    <a 
                      href={ensureAbsoluteUrl(group.link_grupo)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-mono uppercase tracking-widest mt-1"
                    >
                      Ver link <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className={cn("p-2 rounded-xl", getTierColor(group.growth_tier))}>
                  {getTierIcon(group.growth_tier)}
                </div>
              </header>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membros</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{formatNumber(group.quantidade_membros || 0)}</span>
                </div>
                <div className="h-8 w-px bg-gray-100" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    group.status === 'Disponível' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {group.status}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex gap-3 relative z-10">
                <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-gray-600 italic leading-relaxed">
                  "{group.ai_analysis}"
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  getTierColor(group.growth_tier)
                )}>
                  {getTierLabel(group.growth_tier!)}
                </div>
                <span className="text-[10px] text-gray-300 font-bold">Ref: {group.group_id.slice(0, 8)}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
