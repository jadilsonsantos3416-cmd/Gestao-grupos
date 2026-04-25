import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, Copy, CheckCircle2, AlertCircle, Users, ExternalLink, Hash, Flame, Sparkles, Filter } from 'lucide-react';
import { analyzeGroups, RankingResult, RankingInputGroup } from '@/src/lib/rankingUtils';
import { cn, formatNumber, ensureAbsoluteUrl } from '@/src/lib/utils';
import { Group, QuickFilter } from '@/src/types';

interface RankingPageProps {
  groups?: Group[];
  activeFilter?: QuickFilter;
}

export function RankingPage({ groups = [], activeFilter = 'all' }: RankingPageProps) {
  const TEST_DATA = [
    {
      "nome": "Grupo Evangélico Deus É Poderoso",
      "membros": 119000,
      "link": "https://www.facebook.com/groups/455224999619545/",
      "nicho": "Evangélico",
      "prioridade": "ALTA",
      "hot": true,
      "score": 6
    }
  ];

  const [jsonInput, setJsonInput] = useState(JSON.stringify(TEST_DATA, null, 2));
  const [results, setResults] = useState<RankingResult | null>(analyzeGroups(TEST_DATA as any));
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filterGroups = (groupsToFilter: Group[]) => {
    if (activeFilter === 'all') return groupsToFilter;
    
    return groupsToFilter.filter(g => {
      switch (activeFilter) {
        case 'perfil_ativo': return g.perfil_compartilhando === 'Ativo';
        case 'perfil_inativo': return g.perfil_compartilhando === 'Inativo';
        case 'shopee_ativo': return g.uso_shopee === 'Ativo';
        case 'shopee_inativo': return g.uso_shopee === 'Inativo';
        case 'ready_shopee': return g.perfil_compartilhando === 'Ativo' && g.uso_shopee === 'Ativo';
        case 'priority_alta': return (Number(g.quantidade_membros) || 0) >= 30000;
        case 'priority_media': return (Number(g.quantidade_membros) || 0) >= 10000 && (Number(g.quantidade_membros) || 0) < 30000;
        case 'priority_baixa': return (Number(g.quantidade_membros) || 0) < 10000;
        default: return true;
      }
    });
  };

  const mapGroupsToRankingInput = (groupsToMap: Group[]): RankingInputGroup[] => {
    return groupsToMap.map(g => ({
      nome: g.nome_grupo,
      membros: Number(g.quantidade_membros) || 0,
      link: g.link_grupo,
      nicho: g.nicho
    }));
  };

  const handleAnalyzeJson = () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      if (!jsonInput.trim()) {
        setError("Por favor, cole o JSON dos grupos.");
        setIsAnalyzing(false);
        return;
      }
      setTimeout(() => {
        try {
          const data = JSON.parse(jsonInput);
          if (!Array.isArray(data)) {
            setError("O formato deve ser uma lista de grupos (Array).");
            setIsAnalyzing(false);
            return;
          }
          const result = analyzeGroups(data);
          setResults(result);
          setIsAnalyzing(false);
        } catch (err) {
          setError("JSON inválido. Verifique o formato.");
          setIsAnalyzing(false);
        }
      }, 800);
    } catch (err) {
      setError("Erro inesperado.");
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeMyGroups = (onlyFiltered: boolean = false) => {
    setError(null);
    setIsAnalyzing(true);
    
    // Simulate thinking/fetching time for better UX as requested
    setTimeout(() => {
      const groupsToAnalyze = onlyFiltered ? filterGroups(groups) : groups;
      
      if (groupsToAnalyze.length === 0) {
        setError(onlyFiltered ? "Nenhum grupo encontrado com os filtros atuais." : "Você ainda não cadastrou nenhum grupo.");
        setIsAnalyzing(false);
        return;
      }

      const inputData = mapGroupsToRankingInput(groupsToAnalyze);
      const result = analyzeGroups(inputData);
      setResults(result);
      setIsAnalyzing(false);
    }, 1200);
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative">
        <div className="absolute right-0 top-0 w-48 h-48 bg-green-50 rounded-bl-[6rem] flex items-center justify-center -mr-12 -mt-12">
          <Trophy className="w-20 h-20 text-green-200" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Ranking de Postagem</h2>
          <p className="text-gray-500 max-w-2xl font-medium leading-relaxed">
            Analise e classifique seus grupos para descobrir onde suas postagens terão mais alcance e engajamento. Agora com suporte automático para seus grupos cadastrados.
          </p>
        </div>
      </section>

      {/* Control Tools */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Automated Analysis Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:border-green-200 transition-colors">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-500 fill-green-500" /> Modo Automático
            </h3>
            
            <p className="text-xs font-bold text-gray-500 mb-8 leading-relaxed">
              Analise instantaneamente os grupos que você já possui salvos no seu banco de dados, sem precisar copiar e colar JSON.
            </p>

            <div className="mt-auto space-y-3">
              <button
                disabled={isAnalyzing}
                onClick={() => handleAnalyzeMyGroups(false)}
                className={cn(
                  "w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl shadow-xl transition-all active:scale-95",
                  isAnalyzing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Analisando...
                  </div>
                ) : (
                  `Analisar Meus Grupos (${groups.length})`
                )}
              </button>
              <button
                disabled={activeFilter === 'all' || isAnalyzing}
                onClick={() => handleAnalyzeMyGroups(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 border-2",
                  activeFilter === 'all'
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                    : "bg-white text-green-600 border-green-600 hover:bg-green-50"
                )}
              >
                <Filter className="w-3.5 h-3.5" /> Analisar Apenas Filtrados
              </button>
            </div>
          </div>
        </div>

        {/* JSON Manual Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden md:col-span-1 lg:col-span-2">
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Entrada Manual (JSON)
            </h3>
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <textarea
                  className="w-full h-40 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-mono text-[10px] focus:ring-2 focus:ring-green-100 outline-none transition-all resize-none"
                  placeholder='[ { "nome": "Grupo Exemplo", "membros": 50000, "link": "..." } ]'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
              </div>
              <div className="lg:w-48 flex flex-col justify-center">
                <button
                  onClick={handleAnalyzeJson}
                  className="w-full flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest py-6 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Rodar JSON
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-wider ring-1 ring-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Area */}
      <section>
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key="empty"
              className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Flame className="w-10 h-10 text-gray-200" />
              </div>
              <h4 className="text-xl font-black text-gray-900 tracking-tight">Pronto para a análise</h4>
              <p className="text-gray-400 mt-2 max-w-sm">Use o Modo Automático para seus grupos ou cole um JSON para análise externa.</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key="results"
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Total Analisado</h3>
                  <p className="text-3xl font-black text-slate-900">{results.total_unicos} grupos mapeados</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Ações Rápidas:</span>
                  <button
                    onClick={copyToClipboard}
                    className={cn(
                      "flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95",
                      isCopied ? "bg-primary text-white shadow-green-100" : "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {isCopied ? 'Exportar' : 'Copiar JSON'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden relative">
                <div className="px-10 py-8 bg-gray-50/80 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                       🔥 TOP GRUPOS PARA POSTAR
                    </h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Classificação baseada em alcance real e engajamento</p>
                  </div>
                  <span className="shrink-0 self-start sm:self-center text-[10px] font-black bg-primary text-white px-6 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-green-100">
                    🏆 Ranking Automático
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-50">Pos</th>
                        <th className="px-6 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-50">Grupo</th>
                        <th className="px-6 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-50">Membros</th>
                        <th className="px-6 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-50">Nicho</th>
                        <th className="px-6 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center border-b border-slate-50">Score</th>
                        <th className="px-6 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-50">Prioridade</th>
                        <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-right border-b border-slate-50">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.top_grupos.map((group, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-6">
                            <span className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                              idx === 0 ? "bg-amber-400 text-amber-900 shadow-lg shadow-amber-100" :
                              idx === 1 ? "bg-slate-200 text-slate-700" :
                              idx === 2 ? "bg-orange-200 text-orange-800" : "bg-slate-100 text-slate-400"
                            )}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 truncate max-w-[200px] uppercase text-xs">{group.nome}</span>
                              {group.hot && (
                                <span className="text-[8px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 w-fit border border-rose-100">
                                  🔥 Super Hot
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-xs font-bold text-slate-900 font-mono">{formatNumber(group.membros)}</span>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg inline-block capitalize">{group.nicho}</span>
                          </td>
                          <td className="px-6 py-6 border-x border-slate-50 text-center">
                            <span className="text-lg font-bold text-slate-900 font-mono tracking-tighter">
                              {group.score}
                              <span className="text-[8px] ml-1 text-slate-400 uppercase">pts</span>
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block shadow-sm ring-1 ring-white",
                              group.prioridade === 'ALTA' ? "bg-primary text-white" :
                              group.prioridade === 'MÉDIA' ? "bg-amber-400 text-amber-900" : "bg-slate-400 text-white"
                            )}>
                              {group.prioridade}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <a 
                              href={ensureAbsoluteUrl(group.link)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-100 active:scale-95 font-bold text-[9px] uppercase tracking-widest"
                            >
                              👉 POSTAR AQUI <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

