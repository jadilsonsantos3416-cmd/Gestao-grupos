import { useState, useEffect } from 'react';
import { Group } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy
} from 'firebase/firestore';
import * as gruposService from '../lib/gruposService';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'grupos'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData: Group[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        groupsData.push({
          ...data,
          id: doc.id,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Group);
      });
      setGroups(groupsData);
      setIsLoaded(true);
    }, (error) => {
      console.error("Erro ao carregar grupos do Firestore:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addGroup = async (groupData: Omit<Group, 'id' | 'group_id' | 'updatedAt'>) => {
    return await gruposService.adicionarGrupo(groupData as any);
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    return await gruposService.atualizarGrupo(id, updates as any);
  };

  const deleteGroup = async (id: string) => {
    return await gruposService.deletarGrupo(id);
  };

  return { groups, addGroup, updateGroup, deleteGroup, isLoaded };
}
