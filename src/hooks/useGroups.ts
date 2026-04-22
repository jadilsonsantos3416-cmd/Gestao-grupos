import { useState, useEffect } from 'react';
import { Group } from '../types';
import { extractGroupId } from '../lib/groupParser';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'grupos'), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Group[] = snapshot.docs.map((document) => {
          const raw = document.data() as any;

          return {
            id: document.id,
            nome_grupo: raw.nome_grupo || '',
            link_grupo: raw.link_grupo || '',
            group_id: raw.group_id || '',
            nicho: raw.nicho || 'Sem Nicho',
            quantidade_membros: raw.quantidade_membros || 0,
            observacoes: raw.observacoes || '',
            status: raw.status || 'Disponível',
            locatario: raw.locatario || '',
            whatsapp: raw.whatsapp || '',
            data_inicio: raw.data_inicio || '',
            data_vencimento: raw.data_vencimento || '',
            valor: raw.valor || 0,
            updatedAt:
              raw.updatedAt?.toDate?.()?.toISOString?.() ||
              raw.updatedAt ||
              new Date().toISOString(),
          };
        });

        setGroups(data);
        setIsLoaded(true);
      },
      (error) => {
        console.error('Erro ao carregar grupos do Firebase:', error);
        setIsLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  const addGroup = async (group: Omit<Group, 'id' | 'group_id' | 'updatedAt'>) => {
    const group_id = extractGroupId(group.link_grupo);

    await addDoc(collection(db, 'grupos'), {
      ...group,
      group_id,
      updatedAt: serverTimestamp(),
    });
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    const ref = doc(db, 'grupos', id);

    const newGroupId = updates.link_grupo
      ? extractGroupId(updates.link_grupo)
      : updates.group_id;

    await updateDoc(ref, {
      ...updates,
      ...(updates.link_grupo ? { group_id: newGroupId } : {}),
      updatedAt: serverTimestamp(),
    });
  };

  const deleteGroup = async (id: string) => {
    const ref = doc(db, 'grupos', id);
    await deleteDoc(ref);
  };

  return { groups, addGroup, updateGroup, deleteGroup, isLoaded };
}
