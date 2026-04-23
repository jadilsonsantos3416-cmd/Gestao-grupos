/**
 * Intelligent Group Parser Library
 */

export interface ParsedGroup {
  id_temp: string;
  group_id: string;
  nome_grupo: string;
  link_grupo: string;
  nicho: string;
  quantidade_membros: number | null;
  perfil_compartilhando?: 'Ativo' | 'Inativo';
  uso_shopee?: 'Ativo' | 'Inativo';
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
  perfil: /^perfil\s*compartilhando:\s*/i,
  shopee: /^uso\s*shopee:\s*/i,
  obs: /^(obs|observações|observacoes):\s*/i
};

export function cleanGroupName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^[\s. \-)—]+/, '') // Remove leading garbage
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[✅✔️☑️]/gu, '') // Specific check symbols
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

export function parseMembers(str: string): number | null {
  if (!str) return null;
  // Clean string from non-digits but keep decimal point/comma
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*(mil|k)?/i);
  if (!match) return null;

  const valStr = match[1].replace(',', '.');
  const isMil = !!match[2];
  let val = parseFloat(valStr);

  if (isNaN(val)) return null;

  // If it clearly has 'mil' or 'k', or if it's a decimal < 1000, treat as thousands
  if (isMil || (valStr.includes('.') && val < 500)) {
    val = Math.round(val * 1000);
  }
  return val;
}

export function parseBulkText(text: string): ParsedGroup[] {
  // 1. Split text into chunks separated by blank lines (double newlines)
  const chunks = text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
  const results: ParsedGroup[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let group: ParsedGroup = {
      id_temp: Math.random().toString(36).substr(2, 9),
      group_id: '',
      nome_grupo: '',
      link_grupo: '',
      nicho: '',
      quantidade_membros: null,
      perfil_compartilhando: 'Inativo',
      uso_shopee: 'Inativo',
      observacoes: '',
      status_analise: 'Revisar',
      erros: []
    };

    let hasNomeTag = false;
    let hasMembrosTag = false;
    let hasNichoTag = false;

    for (const line of lines) {
      // Nome
      if (line.match(labels.nome)) {
        group.nome_grupo = cleanGroupName(line.replace(labels.nome, ''));
        hasNomeTag = true;
        continue;
      }

      // Membros
      if (line.match(labels.membros)) {
        const valStr = line.replace(labels.membros, '').trim();
        group.quantidade_membros = parseMembers(valStr);
        hasMembrosTag = true;
        continue;
      }

      // Nicho
      if (line.match(labels.obs) || line.match(nichoRegex)) {
        const nichoMatch = line.match(nichoRegex);
        if (nichoMatch) {
          group.nicho = nichoMatch[1].trim();
        } else {
          group.nicho = line.replace(labels.obs, '').trim();
        }
        hasNichoTag = true;
        continue;
      }

      // Link (matches anywhere in line)
      const linkMatch = line.match(linkRegex);
      if (linkMatch) {
        group.link_grupo = linkMatch[1];
        group.group_id = extractGroupId(group.link_grupo);
        continue;
      }

      // Perfil Compartilhando
      if (line.match(labels.perfil)) {
        const val = line.replace(labels.perfil, '').trim().toLowerCase();
        if (val.includes('ativo')) group.perfil_compartilhando = 'Ativo';
        else group.perfil_compartilhando = 'Inativo';
        continue;
      }

      // Uso Shopee
      if (line.match(labels.shopee)) {
        const val = line.replace(labels.shopee, '').trim().toLowerCase();
        if (val.includes('ativo')) group.uso_shopee = 'Ativo';
        else group.uso_shopee = 'Inativo';
        continue;
      }

      // Heuristic: Check if line contains member info but no tag (e.g. "67.900 mil membros")
      if (!hasMembrosTag) {
        const potentialMembers = parseMembers(line);
        if (potentialMembers !== null && (line.toLowerCase().includes('membros') || line.toLowerCase().includes('mil') || line.toLowerCase().includes('k'))) {
          group.quantidade_membros = potentialMembers;
          hasMembrosTag = true;
          continue;
        }
      }

      // Heuristic: If we don't have a name yet and this looks like a name (not a tag)
      if (!group.nome_grupo && !line.includes(':') && line.length > 3) {
        group.nome_grupo = cleanGroupName(line);
      } else if (group.nome_grupo && !line.includes(':')) {
        // Append to observations if it's additional text
        group.observacoes = (group.observacoes ? group.observacoes + ' ' : '') + line;
      }
    }

    // Membros
    const errors: string[] = [];
    if (group.nome_grupo && group.link_grupo) {
      group.status_analise = 'OK';
    } else {
      if (!group.nome_grupo) errors.push('Nome não identificado');
      if (!group.link_grupo) errors.push('Link não identificado');
      group.status_analise = 'Revisar';
    }

    if (group.link_grupo && !group.group_id) {
       errors.push('ID não encontrado');
       group.status_analise = 'Revisar';
    }
    
    group.erros = errors;

    // Use default nicho if missing
    if (!group.nicho) {
      group.nicho = 'Sem Nicho';
    }

    results.push(group);
  }

  return results;
}
