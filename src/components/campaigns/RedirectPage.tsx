import React, { useEffect, useState, useRef } from 'react';
import { useCampaigns } from '@/src/hooks/useCampaigns';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, ExternalLink, Lock } from 'lucide-react';

export function RedirectPage() {
  const [status, setStatus] = useState<'loading' | 'not_found' | 'inactive' | 'error'>('loading');
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const { trackClick, getCampaignBySlug } = useCampaigns();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const handleRedirect = async () => {
      const path = window.location.pathname;
      const slug = path.split('/l/')[1]?.split('?')[0]?.split('#')[0];

      if (!slug) {
        setStatus('not_found');
        return;
      }

      try {
        const campaign = await getCampaignBySlug(slug);
        
        if (!campaign) {
          setStatus('not_found');
          return;
        }

        if (campaign.status === 'Inativa') {
          setStatus('inactive');
          return;
        }

        const rawUrl = campaign.link_original;
        if (!rawUrl) {
          console.error("Link original não encontrado");
          setStatus('error');
          return;
        }

        // Garantir Protocolo
        const destination = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        setTargetUrl(destination);

        // 1. Rastrear em background
        trackClick(slug).catch(e => console.error("Erro no track:", e));

        // 2. Redirecionar Imediatamente
        const redirect = () => {
          console.log("Redirecionando para:", destination);
          try {
            // Tenta forçar a saída do iframe do Studio se necessário
            if (window.top && window.top !== window) {
              window.top.location.href = destination;
            } else {
              window.location.replace(destination);
            }
          } catch (err) {
            // Fallback total
            window.location.href = destination;
          }
        };

        // Redireciona logo
        redirect();

        // Se após 2 segundos ainda estiver aqui, atualiza status para mostrar o botão
        setTimeout(() => {
          setStatus('loading'); // Garante que o botão deir para o link apareça se o redirect falhar
        }, 2000);
        
      } catch (err) {
        console.error('Redirect error:', err);
        setStatus('error');
      }
    };

    handleRedirect();
  }, [getCampaignBySlug, trackClick]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div 
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-sm w-full text-center"
        >
          {status === 'loading' && (
            <div className="space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Redirecionando...</h1>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  {targetUrl ? 'Sua conexão está pronta.' : 'Estamos preparando seu link seguro.'}
                </p>
              </div>
              
              {targetUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  <p className="text-xs text-gray-400 mb-4 italic">Se não for redirecionado automaticamente, clique abaixo:</p>
                  <a 
                    href={targetUrl}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all group"
                  >
                    <span>IR PARA O LINK</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                </motion.div>
              )}
            </div>
          )}

          {status === 'not_found' && (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto border border-orange-100">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Link não encontrado</h1>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Este link pode ter sido removido ou o slug está incorreto.
                </p>
              </div>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg"
              >
                IR PARA DASHBOARD
              </button>
            </div>
          )}

          {/* ... outros estados (simplificados para brevidade no diff) ... */}
          {status === 'inactive' && (
            <div className="space-y-6">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
              <h1 className="text-2xl font-black text-gray-900">Link Inativo</h1>
              <p className="text-sm text-gray-500">Esta campanha foi pausada.</p>
              <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl">VOLTAR</button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 text-red-600">
              <AlertCircle className="w-12 h-12 mx-auto" />
              <h1 className="text-2xl font-black">Erro de Conexão</h1>
              <p className="text-sm">Não foi possível processar o redirecionamento.</p>
              <button onClick={() => window.location.reload()} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl">TENTAR NOVAMENTE</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
