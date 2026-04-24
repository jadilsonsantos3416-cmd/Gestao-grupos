import React, { useState } from 'react';
import { Group, Renter } from '@/src/types';
import { Search, Send, CheckSquare, Square, MessageCircle, ExternalLink, ChevronRight, User } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppTabProps {
  groups: Group[];
}

export function WhatsAppTab({ groups }: WhatsAppTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedRenters, setSelectedRenters] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState("");
  const [showMsgEditor, setShowMsgEditor] = useState(false);
  const [hasEditedManually, setHasEditedManually] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const generateMessage = (renterName?: string) => {
    const greeting = getGreeting();
    const namePart = renterName ? `, ${renterName}` : '';
    return `${greeting}${namePart}! Tudo bem? 😊\n\nSeu aluguel vence hoje.\n\nVai querer renovar pra esse mês?`;
  };

  // Group groups by renter phone
  const renters: (Renter & { groups: Group[] })[] = React.useMemo(() => {
    const map = new Map<string, Renter & { groups: Group[] }>();
    groups.forEach(g => {
      if (g.locatario && g.status === 'Alugado') {
        const phone = g.whatsapp.replace(/\D/g, '');
        if (!map.has(phone)) {
          map.set(phone, {
            nome: g.locatario,
            whatsapp: g.whatsapp,
            lastValor: g.valor,
            lastVencimento: g.data_vencimento,
            groupCount: 1,
            groups: [g]
          });
        } else {
          const r = map.get(phone)!;
          r.groupCount += 1;
          r.groups.push(g);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.groupCount - a.groupCount);
  }, [groups]);

  // Personalize message when selecting or when component mounts
  React.useEffect(() => {
    if (!hasEditedManually && !showMsgEditor) {
      if (selectedRenters.length === 1) {
        const renter = renters.find(r => r.whatsapp.replace(/\D/g, '') === selectedRenters[0]);
        setEditingMessage(generateMessage(renter?.nome));
      } else {
        setEditingMessage(generateMessage());
      }
    }
  }, [selectedRenters, renters, showMsgEditor, hasEditedManually]);

  const filteredRenters = renters.filter(r => {
    const matchesRenter = r.nome.toLowerCase().includes(searchTerm.toLowerCase()) || r.whatsapp.includes(searchTerm);
    const matchesGroup = groupSearch === '' || r.groups.some(g => g.nome_grupo.toLowerCase().includes(groupSearch.toLowerCase()));
    return matchesRenter && matchesGroup;
  });

  const toggleSelect = (phone: string) => {
    setSelectedRenters(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const selectAll = () => {
    if (selectedRenters.length === filteredRenters.length) {
      setSelectedRenters([]);
    } else {
      setSelectedRenters(filteredRenters.map(r => r.whatsapp.replace(/\D/g, '')));
    }
  };

  const sendWhatsApp = (renter: (Renter & { groups: Group[] })) => {
    const phone = renter.whatsapp.replace(/\D/g, '');
    const message = selectedRenters.length === 1 && selectedRenters[0] === phone ? editingMessage : generateMessage(renter.nome);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-200px)]">
      {/* Header & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar locatário..."
              className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-3xl shadow-sm outline-none font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar por Grupo..."
              className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-3xl shadow-sm outline-none font-medium"
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={selectAll}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm text-sm font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
          >
            {selectedRenters.length === filteredRenters.length && filteredRenters.length > 0 ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5" />}
            {selectedRenters.length === filteredRenters.length && filteredRenters.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
          </button>
          <button 
            onClick={() => setShowMsgEditor(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-3xl shadow-lg shadow-green-100 text-sm font-bold hover:bg-green-700 active:scale-95 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Configurar Mensagem
          </button>
        </div>
      </div>

      {/* Renter List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filteredRenters.map((renter, idx) => {
          const phone = renter.whatsapp.replace(/\D/g, '');
          const isSelected = selectedRenters.includes(phone);
          return (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={phone}
              className={cn(
                "group relative bg-white rounded-3xl border transition-all duration-300",
                isSelected ? "border-green-500 shadow-md ring-1 ring-green-500" : "border-gray-100 shadow-sm hover:border-green-200"
              )}
            >
              <div className="flex items-center p-5 gap-4">
                <button 
                  onClick={() => toggleSelect(phone)}
                  className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isSelected ? <CheckSquare className="w-6 h-6 text-green-600" /> : <Square className="w-6 h-6 text-gray-300" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-800 truncate">{renter.nome}</h4>
                    <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {renter.groupCount} {renter.groupCount === 1 ? 'Grupo' : 'Grupos'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                    <Send className="w-3 h-3" /> {renter.whatsapp}
                  </p>
                </div>

                <div className="hidden lg:flex items-center gap-8 px-6 border-x border-gray-50">
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Nichos</p>
                    <p className="text-[11px] font-bold text-gray-600 truncate max-w-[120px]">
                      {Array.from(new Set(renter.groups.map(g => g.nicho))).join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Total Mensal</p>
                    <p className="text-[11px] font-bold text-gray-900">
                      {formatCurrency(renter.groups.reduce((acc, g) => acc + g.valor, 0))}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => sendWhatsApp(renter)}
                  className="shrink-0 w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all active:scale-90"
                  title="Enviar mensagem individual"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {filteredRenters.length === 0 && (
          <div className="bg-white p-16 rounded-[2.5rem] border border-dashed border-gray-200 text-center flex flex-col items-center">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
              <User className="w-12 h-12 text-gray-300" />
            </div>
            <h5 className="font-bold text-gray-400">Nenhum locatário com aluguel ativo encontrado.</h5>
            <p className="text-sm text-gray-300 mt-2">Os locatários aparecem aqui conforme você cadastra grupos alugados.</p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action */}
      <AnimatePresence>
        {selectedRenters.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-100 shadow-2xl rounded-full px-6 py-4 flex items-center gap-6"
          >
            <div className="flex flex-col pr-6 border-r">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Selecionados</span>
              <span className="text-sm font-bold text-green-600">{selectedRenters.length} clientes</span>
            </div>
            <button 
              onClick={() => {
                selectedRenters.forEach((p, idx) => {
                  setTimeout(() => {
                    const renter = renters.find(r => r.whatsapp.replace(/\D/g, '') === p);
                    const message = selectedRenters.length === 1 ? editingMessage : generateMessage(renter?.nome);
                    const url = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }, idx * 1000); // Stagger by 1s to avoid browser blocks
                });
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
            >
              <Send className="w-5 h-5" />
              Enviar Cobrança Web
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Editor Modal */}
      <AnimatePresence>
        {showMsgEditor && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">Mensagem Padrão</h3>
              <div className="space-y-4">
                <textarea 
                  rows={6}
                  value={editingMessage}
                  onChange={e => {
                    setEditingMessage(e.target.value);
                    setHasEditedManually(true);
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-green-100 outline-none resize-none"
                  placeholder="Escreva a mensagem aqui..."
                />
                <div className="bg-yellow-50 p-4 rounded-xl text-yellow-700 text-xs italic flex items-start gap-3">
                  <span className="text-xl leading-none">💡</span>
                  <p>Dica: Evite mencionar nomes de grupos específicos se estiver enviando em lote. Use uma mensagem mais genérica e amigável.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowMsgEditor(false)}
                  className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => setShowMsgEditor(false)}
                  className="flex-1 py-4 font-bold bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
