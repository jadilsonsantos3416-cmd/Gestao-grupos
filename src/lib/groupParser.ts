/**
 * Intelligent Group Parser Library
 */

export interface ParsedGroup {
  id_temp: string;
  group_id: string;
  nome_grupo: string;
  link_grupo: string;
  nicho: string;
  quantidade_membros: number;
  observacoes: string;
  status_analise: 'OK' | 'Incompleto' | 'Revisar';
  erros: string[];
  importAction?: 'import' | 'skip' | 'update';
}

export function extractGroupId(url: string): string {
  if (!url) return '';
  // Match numeric ID in /groups/12345/
  const match = url.match(/\/groups\/(\d+)/i);
  return match ? match[1] : '';
}

// Regex helpers
const nichoRegex = /^nicho:\s*(.+)/i;
const linkRegex = /(https?:\/\/[^\s]+)/i;
const membersRegex = /(\d+(?:[.,]\d+)?)\s*(mil)?\b/gi;
const numberingRegex = /^(\s*[\d. \-)—]+)/;

// Labels to strip or use as markers
const labels = {
  nome: /^nome:\s*/i,
  membros: /^(membros|quantidade):\s*/i,
  link: /^link:\s*/i,
  obs: /^(obs|observações|observacoes):\s*/i
};

export function cleanGroupName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^[\s. \-)—]+/, '') // Remove leading garbage
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

export function parseMembers(str: string): number {
  if (!str) return 0;
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*(mil)?/i);
  if (!match) return 0;

  const valStr = match[1].replace(',', '.');
  const isMil = !!match[2];
  let val = parseFloat(valStr);

  // Heuristic: if it's a small number with decimal or has "mil", it's thousands
  if (isMil || (val < 1000 && valStr.includes('.'))) {
    val = Math.round(val * 1000);
  }
  return val;
}

export function parseBulkText(text: string): ParsedGroup[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedGroup[] = [];
  let currentNicho = '';

  let currentGroup: Partial<ParsedGroup> | null = null;

  for (let line of lines) {
    // 1. Check for Niche line
    const nichoMatch = line.match(nichoRegex);
    if (nichoMatch) {
      if (currentGroup) finalizeGroup(currentGroup as ParsedGroup);
      currentGroup = null;
      currentNicho = nichoMatch[1].trim();
      continue;
    }

    // 2. Identify if this line looks like a NEW group start
    const hasNumbering = numberingRegex.test(line);
    const hasLink = linkRegex.test(line);
    
    // Heuristic for "is this a new group?"
    // - Has numbering (e.g. "1. Group Name")
    // - OR we have no group yet
    // - OR (We have a group but it already has a link AND this line has a new potential name/id)
    
    let isNewGroup = false;
    if (hasNumbering) {
      isNewGroup = true;
    } else if (!currentGroup) {
      isNewGroup = true;
    } else if (currentGroup.link_grupo && !hasLink && !line.match(labels.membros)) {
       // If current group already has a link and this new line doesn't seem like a follow-up value,
       // it might be a new group start.
       isNewGroup = true;
    }

    if (isNewGroup && currentGroup) {
      finalizeGroup(currentGroup as ParsedGroup);
      currentGroup = null;
    }

    if (!currentGroup) {
      currentGroup = {
        nome_grupo: '',
        link_grupo: '',
        group_id: '',
        quantidade_membros: 0,
        observacoes: '',
        nicho: currentNicho,
        id_temp: Math.random().toString(36).substr(2, 9)
      };
    }

    // 3. Extract components from the line
    let remainingLine = line;

    // Link
    const linkMatch = remainingLine.match(linkRegex);
    if (linkMatch) {
      const link = linkMatch[1];
      if (!currentGroup.link_grupo) {
        currentGroup.link_grupo = link;
        currentGroup.group_id = extractGroupId(link);
      }
      remainingLine = remainingLine.replace(link, '').replace(labels.link, '').trim();
    }

    // Members (Extract all potential member patterns)
    const matches = Array.from(remainingLine.matchAll(membersRegex));
    if (matches.length > 0) {
      // Find the best match (usually the one with 'mil' or at the end of the line)
      const bestMatch = matches.find(m => m[2]) || matches[matches.length - 1];
      if (bestMatch) {
         const val = parseMembers(bestMatch[0]);
         if (currentGroup.quantidade_membros === 0) {
           currentGroup.quantidade_membros = val;
         }
         // Remove this specific match from the name string
         remainingLine = remainingLine.replace(bestMatch[0], '').trim();
      }
    }

    // Cleaning remaining text
    remainingLine = remainingLine
      .replace(numberingRegex, '')
      .replace(labels.nome, '')
      .replace(labels.obs, '')
      .replace(labels.membros, '')
      .trim();

    if (remainingLine) {
      if (!currentGroup.nome_grupo) {
        currentGroup.nome_grupo = cleanGroupName(remainingLine);
      } else {
        currentGroup.observacoes = (currentGroup.observacoes ? currentGroup.observacoes + ' ' : '') + remainingLine;
      }
    }
  }

  if (currentGroup) finalizeGroup(currentGroup as ParsedGroup);

  function finalizeGroup(group: ParsedGroup) {
    // Final clean of group name in case it was built iteratively
    group.nome_grupo = cleanGroupName(group.nome_grupo);
    
    // If it's just garbage, ignore
    if (!group.nome_grupo && !group.link_grupo && !group.quantidade_membros) return;

    if (!group.id_temp) group.id_temp = Math.random().toString(36).substr(2, 9);
    if (!group.nicho) group.nicho = currentNicho || 'Sem Nicho';
    
    const errors: string[] = [];
    if (!group.nome_grupo) errors.push('Nome ausente');
    if (!group.link_grupo) errors.push('Link ausente');
    if (!group.quantidade_membros) errors.push('Membros zerados');

    group.status_analise = errors.length === 0 ? 'OK' : (errors.length > 1 ? 'Revisar' : 'Incompleto');
    group.erros = errors;
    
    results.push(group);
  }

  return results;
}
