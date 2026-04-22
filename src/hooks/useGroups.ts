import { useState, useEffect } from 'react';
import { Group } from '../types';
import { extractGroupId } from '../lib/groupParser';

const STORAGE_KEY = 'fb_rental_manager_groups';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGroups(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load groups from localStorage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    }
  }, [groups, isLoaded]);

  const addGroup = (group: Omit<Group, 'id' | 'group_id' | 'updatedAt'>) => {
    const newGroup: Group = {
      ...group,
      group_id: extractGroupId(group.link_grupo),
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    setGroups((prev) => [...prev, newGroup]);
  };

  const updateGroup = (id: string, updates: Partial<Group>) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const newGroupId = updates.link_grupo ? extractGroupId(updates.link_grupo) : g.group_id;
          return { ...g, ...updates, group_id: newGroupId, updatedAt: new Date().toISOString() };
        }
        return g;
      })
    );
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  return { groups, addGroup, updateGroup, deleteGroup, isLoaded };
}
