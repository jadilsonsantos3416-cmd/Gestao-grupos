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
  const results: ParsedGroup[] = [];

  const blocks = text
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    let nome_grupo = '';
    let link_grupo = '';
    let group_id = '';
    let nicho = '';
    let quantidade_membros: number | null = null;
    let observacoes = '';

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.startsWith('nome:')) {
        nome_grupo = cleanGroupName(line.replace(/^nome:\s*/i, ''));
        continue;
      }

      if (lower.startsWith('membros:') || lower.startsWith('quantidade:')) {
        const valor = line.replace(/^(membros|quantidade):\s*/i, '').trim();
        const parsed = parseMembers(valor);
        quantidade_membros = parsed > 0 ? parsed : null;
        continue;
      }

      if (lower.startsWith('nicho:')) {
        nicho = line.replace(/^nicho:\s*/i, '').trim();
        continue;
      }

      if (lower.startsWith('link:')) {
        const valor = line.replace(/^link:\s*/i, '').trim();
        link_grupo = valor;
        group_id = extractGroupId(valor);
        continue;
      }

      if (line.includes('facebook.com/groups')) {
        link_grupo = line.trim();
        group_id = extractGroupId(link_grupo);
        continue;
      }

      if (lower.startsWith('obs:') || lower.startsWith('observações:') || lower.startsWith('observacoes:')) {
        observacoes = line.replace(/^(obs|observações|observacoes):\s*/i, '').trim();
        continue;
      }

      if (!nome_grupo && !line.includes('facebook.com/groups')) {
        nome_grupo = cleanGroupName(line);
        continue;
      }

      observacoes = observacoes ? `${observacoes} ${line}` : line;
    }

    const erros: string[] = [];
    if (!nome_grupo) erros.push('Nome ausente');
    if (!link_grupo) erros.push('Link ausente');
    if (link_grupo && !group_id) erros.push('ID não encontrado');

    const status_analise: 'OK' | 'Incompleto' | 'Revisar' =
      erros.length === 0 ? 'OK' : 'Revisar';

    results.push({
      id_temp: Math.random().toString(36).substr(2, 9),
      group_id,
      nome_grupo,
      link_grupo,
      nicho: nicho || 'Sem Nicho',
      quantidade_membros: quantidade_membros ?? 0,
      observacoes,
      status_analise,
      erros
    });
  }

  return results;
}
