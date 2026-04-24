import React, { useEffect, useState, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  doc, 
  updateDoc, 
  increment, 
  addDoc 
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Campaign } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

export function RedirectPage() {
  const [status, setStatus] = useState<'loading' | 'not_found' | 'inactive' | 'error'>('loading');
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const handleRedirect = async () => {
      // 1. Extração rápida do slug
      const slug = window.location.pathname.split('/l/')[1]?.split('?')[0]?.split('#')[0];

      if (!slug) {
        setStatus('not_found');
        return;
      }

      try {
        // 2. Query ultra-leve (direto sem o overhead do useCampaigns)
        const q = query(
          collection(db, 'campanhas'), 
          where('slug', '==', slug),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setStatus('not_found');
          return;
        }

        const campaignDoc = snapshot.docs[0];
        const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;

        // 3. Verificação de status
        if (campaign.status === 'Inativa') {
          setStatus('inactive');
          return;
        }

        // 4. Normalização do Link
        let destination = (campaign.link_original || "").trim();
        if (!destination) {
          setStatus('error');
          return;
        }

        destination = destination.replace(/\s+/g, '');
        while (destination.match(/^https?:\/\/https?:\/\//i)) {
          destination = destination.replace(/^https?:\/\//i, '');
        }
        if (!destination.match(/^https?:\/\//i)) {
          destination = `https://${destination}`;
        }

        setTargetUrl(destination);

        // 5. REDIRECIONAMENTO IMEDIATO (PRIORIDADE MÁXIMA)
        const performRedirection = () => {
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = destination;
            } else {
              window.location.replace(destination);
            }
          } catch (e) {
            window.location.href = destination;
          }
        };

        // EXECUTAR AGORA
        performRedirection();

        // 6. Rastreamento em Background (Não aguardamos para ser instantâneo)
        // Fire-and-forget
        (async () => {
          try {
            await Promise.all([
              updateDoc(doc(db, 'campanhas', campaign.id), {
                cliques: increment(1),
                atualizado_em: new Date().toISOString()
              }),
              addDoc(collection(db, 'cliques_log'), {
                campanha_id: campaign.id,
                slug: campaign.slug,
                data_hora: new Date().toISOString(),
                userAgent: navigator.userAgent,
                origem: campaign.origem,
                grupo_id: campaign.grupo_id
              })
            ]);
          } catch (e) {
            console.error("Silent background track error:", e);
          }
        })();

        // Fallback UI se o redirect demorar a responder (ex: browser slow)
        setTimeout(() => setStatus('loading'), 2000);
        
      } catch (err) {
        console.error('Fast redirect error:', err);
        setStatus('error');
      }
    };

    handleRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div 
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-sm w-full text-center"
        >
          {status === 'loading' && (
            <div className="space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Redirecionando...</h1>
                <p className="text-sm text-gray-500 font-medium">
                  Preparando sua conexão segura.
                </p>
              </div>
              
              {targetUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <p className="text-xs text-gray-400 mb-4">Clique abaixo se não for redirecionado:</p>
                  <a 
                    href={targetUrl}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white font-black rounded-2xl"
                  >
                    <span>ABRIR LINK AGORA</span>
                    <ExternalLink className="w-4 h-4" />
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
              <h1 className="text-2xl font-black text-gray-900">Link não encontrado</h1>
              <p className="text-sm text-gray-500 font-medium">O link expirou ou é inválido.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl"
              >
                VOLTAR
              </button>
            </div>
          )}

          {status === 'inactive' && (
            <div className="space-y-6">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
              <h1 className="text-2xl font-black text-gray-900">Link Inativo</h1>
              <p className="text-sm text-gray-500">Esta oferta expirou.</p>
              <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl">VOLTAR</button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-2xl font-black text-gray-900">Erro na Conexão</h1>
              <p className="text-sm text-gray-500">Houve um problema ao processar seu link.</p>
              <button onClick={() => window.location.reload()} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl">TENTAR NOVAMENTE</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
