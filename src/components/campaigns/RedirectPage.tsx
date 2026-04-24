import React, { useEffect, useState } from 'react';
import { useCampaigns } from '@/src/hooks/useCampaigns';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, Lock } from 'lucide-react';

export function RedirectPage() {
  const [status, setStatus] = useState<'loading' | 'not_found' | 'inactive' | 'error'>('loading');
  const { trackClick, getCampaignBySlug } = useCampaigns();

  useEffect(() => {
    const handleRedirect = async () => {
      const path = window.location.pathname;
      const parts = path.split('/l/');
      const slug = parts[1]?.split('?')[0]?.split('#')[0];

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

        // Track click and get original link
        const originalLink = await trackClick(slug);
        
        if (originalLink) {
          window.location.href = originalLink;
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setStatus('error');
      }
    };

    handleRedirect();
  }, [trackClick, getCampaignBySlug]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Redirecionando...</h1>
            <p className="text-gray-500">Estamos preparando sua conexão segura.</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Link não encontrado</h1>
            <p className="text-gray-500">O link que você seguiu pode estar expirado ou incorreto.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        )}

        {status === 'inactive' && (
          <div className="space-y-4">
            <Lock className="w-12 h-12 text-gray-400 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Campanha Indisponível</h1>
            <p className="text-gray-500">Esta oferta ou campanha não está mais disponível no momento.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-6 w-full bg-gray-600 text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Erro no Redirecionamento</h1>
            <p className="text-gray-500">Houve um problema técnico ao processar seu link. Tente novamente mais tarde.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
