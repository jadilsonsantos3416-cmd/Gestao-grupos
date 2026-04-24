import { GoogleGenAI, Type } from "@google/genai";
import { Group, GrowthTier } from "../types";

export interface AIAnalysisResult {
  groupId: string;
  tier: GrowthTier;
  reasoning: string;
}

// Lazy initialization to avoid crashes if API key is missing
let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeGroupsGrowth(groups: Group[]): Promise<AIAnalysisResult[]> {
  try {
    const ai = getAI();
    
    // Process in batches if there are many groups (Gemini 3 Flash handles large context but let's keep it tidy)
    // For this app, usually it's around 10-100 groups.
    const prompt = `Analise os seguintes grupos do Facebook e classifique-os em três níveis de potencial de crescimento:
- High (Alto potencial: muitos membros, nicho quente, engajamento provável)
- Medium (Capacidade média: crescimento constante mas moderado)
- Low (Baixa capacidade: nicho saturado, poucos membros ou nome genérico demais)

Grupos para analisar:
${groups.map(g => `- ID: ${g.id}, Nome: ${g.nome_grupo}, Nicho: ${g.nicho}, Membros: ${g.quantidade_membros || 0}`).join('\n')}

Retorne um JSON com a classificação de cada grupo (groupId), o nível (tier) e uma breve frase de justificativa (reasoning) em português.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              groupId: { type: Type.STRING },
              tier: { 
                type: Type.STRING,
                enum: ['High', 'Medium', 'Low'] 
              },
              reasoning: { type: Type.STRING }
            },
            required: ['groupId', 'tier', 'reasoning']
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      console.warn("AI returned empty response text");
      return [];
    }

    const result = JSON.parse(responseText);
    console.log("Resultados da IA:", result);
    return result;
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    throw error;
  }
}
