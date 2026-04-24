import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, Copy, CheckCircle2, AlertCircle, Users, ExternalLink, Hash, Flame } from 'lucide-react';
import { analyzeGroups, RankingResult } from '@/src/lib/rankingUtils';
import { cn, formatNumber, ensureAbsoluteUrl } from '@/src/lib/utils';

export function RankingPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [results, setResults] = useState<RankingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleAnalyze = () => {
    try {
      setError(null);
      if (!jsonInput.trim()) {
        setError("Por favor, cole o JSON dos grupos.");
        return;
      }
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) {
        setError("O formato deve ser uma lista de grupos (Array).");
        return;
      }
      const result = analyzeGroups(data);
      setResults(result);
    } catch (err) {
      setError("JSON inválido. Verifique o formato.");
    }
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-bl-[4rem] flex items-center justify-center -mr-8 -mt-8">
          <Trophy className="w-12 h-12 text-green-200" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Ranking de Postagem</h2>
          <p className="text-gray-500 max-w-2xl font-medium">
            Analise e classifique seus grupos para descobrir onde suas postagens terão mais alcance e engajamento.
          </p>
        </div>
      </section>

      {/* Input Area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Entrada de Dados (JSON)
            </h3>
            <textarea
              className="w-full h-80 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-mono text-xs focus:ring-2 focus:ring-green-100 outline-none transition-all resize-none"
              placeholder='[
  {
    "nome": "Grupo Exemplo",
    "membros": 50000,
    "link": "https://facebook.com/groups/..."
  }
]'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            {error && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold ring-1 ring-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              onClick={handleAnalyze}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95 group"
            >
              <Play className="w-5 h-5 fill-current" />
              Analisar Grupos
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="empty"
                className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center h-full"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Flame className="w-10 h-10 text-gray-200" />
                </div>
                <h4 className="font-bold text-gray-400">Aguardando análise...</h4>
                <p className="text-sm text-gray-300 mt-1">Cole o JSON ao lado para iniciar</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key="results"
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Total Analisado</h3>
                    <p className="text-2xl font-black text-gray-900">{results.total_unicos} grupos únicos</p>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                      isCopied ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'Copiado!' : 'Copiar JSON Final'}
                  </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                  <div className="px-8 py-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                       Top 10 Melhores Grupos
                    </h4>
                    <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full uppercase tracking-widest">
                      🏆 Recomendações
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white">
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Pos</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Nome</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Membros</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Nicho</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Hot</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Score</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Prioridade</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {results.top_grupos.map((group, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                                idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                idx === 1 ? "bg-slate-100 text-slate-600" :
                                idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"
                              )}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900 truncate max-w-[150px] inline-block">{group.nome}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-600 font-mono">{formatNumber(group.membros)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md inline-block capitalize">{group.nicho}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {group.hot ? (
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mx-auto">🔥 Sim</span>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 px-2 py-0.5 rounded-md inline-block mx-auto">Não</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                                  {group.score} pts
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-block",
                                group.prioridade === 'ALTA' ? "bg-green-100 text-green-700" :
                                group.prioridade === 'MÉDIA' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                              )}>
                                {group.prioridade}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <a href={ensureAbsoluteUrl(group.link)} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all inline-block">
                                <ExternalLink className="w-4 h-4" />
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
        </div>
      </section>
    </div>
  );
}
