
export interface RankingInputGroup {
  nome: string;
  membros: number;
  link: string;
  nicho?: string;
}

export interface RankedGroup extends RankingInputGroup {
  nicho: string;
  prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA';
  hot: boolean;
  score: number;
}

export interface RankingResult {
  total_unicos: number;
  top_grupos: RankedGroup[];
}

const HOT_KEYWORDS = ["deus", "jesus", "evang", "bíblia", "crist", "palavra", "pastor", "bispo", "fé", "oração", "igreja"];

export function analyzeGroups(input: RankingInputGroup[]): RankingResult {
  // 1. Remove duplicates by Link
  const uniqueGroupsMap = new Map<string, RankingInputGroup>();
  input.forEach(g => {
    const link = g.link || '';
    if (link && !uniqueGroupsMap.has(link)) {
      uniqueGroupsMap.set(link, g);
    }
  });

  const uniqueGroups = Array.from(uniqueGroupsMap.values());
  const total_unicos = uniqueGroups.length;

  // 2. Process each group
  const rankedGroups: RankedGroup[] = uniqueGroups.map(g => {
    const nomeLower = (g.nome || '').toLowerCase();
    const membros = g.membros || 0;
    
    // 3. Hot Detection
    const isHot = HOT_KEYWORDS.some(kw => nomeLower.includes(kw));

    // 4. Niche Detection
    let detectedNicho = g.nicho || '';
    if (!detectedNicho) {
      if (isHot || nomeLower.includes("igreja")) {
        detectedNicho = 'Evangélico';
      } else if (nomeLower.includes("fc") || nomeLower.includes("fãs") || nomeLower.includes("fã") || nomeLower.includes("ofc") || nomeLower.includes("famoso")) {
        detectedNicho = 'Fã / Entretenimento';
      } else if (nomeLower.includes("influencer") || nomeLower.includes("blog") || nomeLower.includes("canald")) {
        detectedNicho = 'Influencer';
      } else if (nomeLower.includes("cantor") || nomeLower.includes("música") || nomeLower.includes("show") || nomeLower.includes("artista")) {
        detectedNicho = 'Música';
      } else {
        detectedNicho = 'Geral';
      }
    }

    // 5. Priority
    let prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA';
    if (membros >= 30000) prioridade = 'ALTA';
    else if (membros >= 10000) prioridade = 'MÉDIA';
    else prioridade = 'BAIXA';

    // 6. Score calculation
    let score = 0;
    
    // Members score
    if (membros >= 30000) score += 3;
    else if (membros >= 20000) score += 2;
    else if (membros >= 10000) score += 1;

    // Hot score
    if (isHot) score += 3;

    // Niche score
    if (detectedNicho === 'Música' || detectedNicho === 'Influencer') score += 2;
    else if (detectedNicho === 'Fã / Entretenimento' || detectedNicho === 'Entretenimento') score += 1;

    return {
      ...g,
      nicho: detectedNicho,
      prioridade,
      hot: isHot,
      score
    };
  });

  // 7. Sort
  const sorted = rankedGroups.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.membros - a.membros;
  });

  // 8. Top 10
  return {
    total_unicos,
    top_grupos: sorted.slice(0, 10)
  };
}
