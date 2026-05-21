import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/^https?:\/\//i, '') // Remove http/https
    .replace(/^www\./i, '') // Remove www
    .replace(/\/$/, '') // Remove barra final
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim();
}

export function normalizeText(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/\//g, ' ') // Replace slashes with spaces
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .trim();
}

export function normalizeNicho(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\//g, ' / ') // Padronizar barras com espaço
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .trim();
}

export function extractFacebookGroupId(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  // Se for apenas números
  if (/^\d+$/.test(trimmed)) return trimmed;
  // Se for link, tenta extrair o ID
  const match = trimmed.match(/\/groups\/(\d+)/i);
  return match ? match[1] : '';
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('pt-BR').format(num);
}

export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ensureAbsoluteUrl(link: string): string {
  if (!link) return '';
  
  const trimmedLink = link.trim();
  
  // If it's just a numeric ID, assume it's a Facebook group ID
  if (/^\d+$/.test(trimmedLink)) {
    return `https://www.facebook.com/groups/${trimmedLink}`;
  }

  // If it's an ID that looks like facebook numeric ID but might have alphabets if it's a vanity URL/slug
  // Actually, if it doesn't have a protocol and doesn't have dots, it's probably an ID
  if (!trimmedLink.includes('://') && !trimmedLink.includes('.')) {
    return `https://www.facebook.com/groups/${trimmedLink}`;
  }

  // If it doesn't start with http or https, add it
  if (!/^https?:\/\//i.test(trimmedLink)) {
    return `https://${trimmedLink}`;
  }

  return trimmedLink;
}

export function parseMembers(val: string): number {
  if (!val) return 0;
  
  // Remove dots and replace comma with dots for parsing
  let clean = val.toLowerCase().trim();
  
  // Check for "mil" or "k"
  const isThousand = clean.includes('mil') || clean.includes('k');
  clean = clean.replace(/mil|k|membros|seguidores/g, '').trim();

  // Replace comma with dot for float parsing
  clean = clean.replace(/\./g, '').replace(',', '.');
  
  let num = parseFloat(clean);
  if (isNaN(num)) return 0;
  
  if (isThousand) num = num * 1000;
  
  return Math.floor(num);
}

export function calcularValorSugeridoAluguel(grupo: any): {
  valorSugeridoAluguel: number;
  faixa: string;
  justificativa: string;
} {
  const membrosCount = typeof grupo.quantidade_membros === 'number' 
    ? grupo.quantidade_membros 
    : (typeof grupo.membros === 'number' ? grupo.membros : parseMembers(String(grupo.quantidade_membros || grupo.membros || '0')));

  // Base calculation
  let valorBase = membrosCount * 0.004;

  // Niche Multipliers
  const nichoMultipliers: Record<string, number> = {
    'Musa': 1.25,
    'Influencer': 1.20,
    'Evangélico': 1.15,
    'Receitas / Culinária': 1.15,
    'Beleza / Cabelo': 1.10,
    'Fã / Música': 1.00,
    'Humor': 1.00,
    'Agro / Notícias': 0.95,
    'Motivacional': 1.10,
    'Sem Nicho': 0.80,
  };

  const nicho = grupo.nicho || 'Sem Nicho';
  let nichoMult = nichoMultipliers[nicho] || 1.00;
  
  if (!nichoMultipliers[nicho]) {
    const nichoLower = nicho.toLowerCase();
    if (nichoLower.includes('musa')) nichoMult = 1.25;
    else if (nichoLower.includes('influencer')) nichoMult = 1.20;
    else if (nichoLower.includes('evangélico') || nichoLower.includes('gospel')) nichoMult = 1.15;
    else if (nichoLower.includes('receita') || nichoLower.includes('culinária')) nichoMult = 1.15;
    else if (nichoLower.includes('beleza') || nichoLower.includes('cabelo')) nichoMult = 1.10;
    else if (nichoLower.includes('agro') || nichoLower.includes('notícia')) nichoMult = 0.95;
    else if (nichoLower.includes('motivacional')) nichoMult = 1.10;
    else if (nichoLower === 'geral' || nichoLower === '') nichoMult = 1.00;
  }

  // Priority Multipliers
  let priorityMult = 1.00;
  const priority = grupo.prioridade_postagem || grupo.priorityInfo?.prioridade;
  if (priority === 'Alta') priorityMult = 1.25;
  else if (priority === 'Média') priorityMult = 1.00;
  else if (priority === 'Baixa') priorityMult = 0.75;

  // Score Multipliers
  let scoreMult = 1.00;
  const score = grupo.score_postagem;
  if (score !== undefined && score !== null) {
     if (score >= 8) scoreMult = 1.35;
     else if (score >= 5) scoreMult = 1.20;
     else if (score >= 3) scoreMult = 1.00;
     else scoreMult = 0.80;
  }

  // Activity Multipliers
  let activityMult = 1.00;
  if (grupo.perfil_compartilhando === 'Ativo') activityMult *= 1.10;
  if (grupo.uso_shopee === 'Ativo') activityMult *= 1.10;

  let valorFinal = valorBase * nichoMult * priorityMult * scoreMult * activityMult;

  // Rounding rules
  if (valorFinal <= 100) {
    valorFinal = Math.round(valorFinal / 10) * 10;
  } else {
    valorFinal = Math.round(valorFinal / 50) * 50;
  }

  // Min value
  valorFinal = Math.max(30, valorFinal);

  // Faixas (just for labels or info)
  let faixa = "";
  if (membrosCount <= 5000) faixa = "Até 5.000 membros (R$ 30 a R$ 50)";
  else if (membrosCount <= 10000) faixa = "5.001 até 10.000 membros (R$ 50 a R$ 80)";
  else if (membrosCount <= 30000) faixa = "10.001 até 30.000 membros (R$ 80 a R$ 150)";
  else if (membrosCount <= 70000) faixa = "30.001 até 70.000 membros (R$ 150 a R$ 300)";
  else if (membrosCount <= 150000) faixa = "70.001 até 150.000 membros (R$ 300 a R$ 600)";
  else if (membrosCount <= 300000) faixa = "150.001 até 300.000 membros (R$ 600 a R$ 1.000)";
  else faixa = "Acima de 300.000 membros (R$ 1.000+)";

  const justificativa = `Baseado em ${formatNumber(membrosCount)} membros, nicho ${nicho}, prioridade ${priority || 'N/D'} e score ${score || 'N/D'}.`;

  return {
    valorSugeridoAluguel: valorFinal,
    faixa,
    justificativa
  };
}

export async function detectGroupPrivacy(link: string): Promise<'Público' | 'Privado' | 'Não verificado'> {
  if (!link) return 'Não verificado';
  
  try {
    const encodedUrl = encodeURIComponent(link);
    const proxyUrl = `https://api.allorigins.win/get?url=${encodedUrl}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) return 'Não verificado';
    
    const data = await response.json();
    const html = data?.contents || '';
    
    if (!html) return 'Não verificado';
    
    // Procura padrões de grupos públicos e privados do FB
    if (
      html.includes('"privacy":"PUBLIC"') || 
      html.includes('"privacyType":"PUBLIC"') || 
      html.includes('Grupo público') || 
      html.includes('Public group') || 
      html.toLowerCase().includes('public_group') ||
      html.includes('id="group_header_public"') ||
      html.includes('property="og:description" content="Grupo público') ||
      html.includes('property="og:description" content="Public group')
    ) {
      return 'Público';
    }
    
    if (
      html.includes('"privacy":"CLOSED"') || 
      html.includes('"privacy":"SECRET"') || 
      html.includes('Grupo privado') || 
      html.includes('Private group') || 
      html.toLowerCase().includes('private_group') ||
      html.includes('id="group_header_private"') ||
      html.includes('property="og:description" content="Grupo privado') ||
      html.includes('property="og:description" content="Private group')
    ) {
      return 'Privado';
    }
    
    return 'Não verificado';
  } catch (error) {
    console.error("Erro ao verificar privacidade do grupo:", error);
    return 'Não verificado';
  }
}

