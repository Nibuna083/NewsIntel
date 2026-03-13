import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  title: string;
  summary: string;
  problemType: string;
  event: string;
  rootCauses: string[];
  entities: { type: string; value: string }[];
  causalSentences: string[];
}

export async function analyzeNewsContent(content: string): Promise<AnalysisResult> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Analyze the following news article text:
       1. Identify the main Event.
       2. Classify the Problem Type (e.g., Natural Disaster, Infrastructure Failure, Political Conflict, Economic Issue, Environmental Problem, Industrial Accident, Public Health Crisis).
       3. Extract Named Entities (Persons, Organizations, Locations, Dates).
       4. Identify Root Causes for the event.
       5. Extract specific sentences that show causal relationships (using phrases like "due to", "caused by", etc.).
       6. Provide a brief summary and the article title.
       Return the result as a JSON object.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt + "\n\nContent:\n" + content }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          problemType: { type: Type.STRING },
          event: { type: Type.STRING },
          rootCauses: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                value: { type: Type.STRING }
              },
              required: ["type", "value"]
            }
          },
          causalSentences: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "summary", "problemType", "event", "rootCauses", "entities", "causalSentences"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as AnalysisResult;
}

export async function analyzeNewsByDate(date: string, region: string): Promise<AnalysisResult> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Find significant news events that occurred on ${date} in the region of ${region}. 
       Select the most impactful news story and perform the following:
       1. Identify the main Event.
       2. Classify the Problem Type (e.g., Natural Disaster, Infrastructure Failure, Political Conflict, Economic Issue, Environmental Problem, Industrial Accident, Public Health Crisis).
       3. Extract Named Entities (Persons, Organizations, Locations, Dates).
       4. Identify Root Causes for the event.
       5. Extract specific sentences or descriptions that show causal relationships.
       6. Provide a brief summary and the article title.
       Return the result as a JSON object.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          problemType: { type: Type.STRING },
          event: { type: Type.STRING },
          rootCauses: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                value: { type: Type.STRING }
              },
              required: ["type", "value"]
            }
          },
          causalSentences: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "summary", "problemType", "event", "rootCauses", "entities", "causalSentences"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as AnalysisResult;
}
