import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  increment,
  where,
  getDocs,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Campaign, CampaignStatus, CampaignClickLog } from '@/src/types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'campanhas'), orderBy('criado_em', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const campaignsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];
      setCampaigns(campaignsData);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const generateSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let slug = '';
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  };

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'cliques' | 'link_curto' | 'criado_em' | 'atualizado_em'> & { slug?: string }) => {
    const slug = campaignData.slug || generateSlug();
    const domain = 'https://gestao-grupos.vercel.app';
    const link_curto = `${domain}/l/${slug}`;
    
    await addDoc(collection(db, 'campanhas'), {
      ...campaignData,
      slug,
      link_curto,
      cliques: 0,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const campaignRef = doc(db, 'campanhas', id);
    const domain = 'https://gestao-grupos.vercel.app';
    
    // Get existing slug if not provided in updates
    const existingCampaign = campaigns.find(c => c.id === id);
    const slug = updates.slug || existingCampaign?.slug;
    
    const finalUpdates = { ...updates };
    if (slug) {
      finalUpdates.link_curto = `${domain}/l/${slug}`;
    }
    
    await updateDoc(campaignRef, {
      ...finalUpdates,
      atualizado_em: new Date().toISOString(),
    });
  };

  const deleteCampaign = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'campanhas', id));
      return { success: true };
    } catch (error) {
      console.error("Error deleting campaign:", error);
      return { success: false, error };
    }
  };

  const trackClick = async (slug: string) => {
    const q = query(
      collection(db, 'campanhas'), 
      where('slug', '==', slug),
      where('status', '==', 'Ativa'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const campaignDoc = snapshot.docs[0];
    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;

    // Increment click counter
    await updateDoc(doc(db, 'campanhas', campaign.id), {
      cliques: increment(1),
      atualizado_em: new Date().toISOString()
    });

    // Log the click
    await addDoc(collection(db, 'cliques_log'), {
      campanha_id: campaign.id,
      slug: campaign.slug,
      data_hora: new Date().toISOString(),
      userAgent: navigator.userAgent,
      origem: campaign.origem,
      grupo_id: campaign.grupo_id
    });

    return campaign.link_original;
  };

  const getCampaignBySlug = async (slug: string) => {
    const q = query(
      collection(db, 'campanhas'), 
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Campaign;
  };

  return {
    campaigns,
    isLoaded,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    trackClick,
    getCampaignBySlug
  };
}
