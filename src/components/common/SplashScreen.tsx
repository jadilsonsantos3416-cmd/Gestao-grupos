import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Facebook, Loader2 } from 'lucide-react';

export const SplashScreen = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-xl shadow-green-200 mb-6">
              <Facebook className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Grupos <span className="text-primary">FB</span>
            </h1>
            <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">
              Gestão inteligente de grupos
            </p>
          </motion.div>

          <div className="absolute bottom-16 flex flex-col items-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Carregando ambiente...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
