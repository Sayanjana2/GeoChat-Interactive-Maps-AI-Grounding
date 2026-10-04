import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface MapContext {
  center?: { lat: number; lng: number };
  zoom?: number;
  locationName?: string;
  selectedPlace?: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
    category?: string;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  roleId?: 'explorer' | 'planner' | 'grounding';
  mapContext?: MapContext;
  useSearch?: boolean;
}

export interface PlaceMarker {
  id: string;
  name: string;
  category: 'restaurant' | 'cafe' | 'landmark' | 'museum' | 'park' | 'hotel' | 'transit' | 'shopping' | 'other';
  lat: number;
  lng: number;
  description: string;
  address?: string;
  rating?: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatResponse {
  text: string;
  places: PlaceMarker[];
  groundingSources: GroundingSource[];
  searchQueries: string[];
  modelUsed: string;
}

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export async function handleChatRequest(body: ChatRequest): Promise<ChatResponse> {
  const ai = getAiClient();

  const model = body.model || 'gemini-3.5-flash';
  const roleId = body.roleId || 'explorer';
  const useSearch = body.useSearch !== false; // default true for Search Grounding

  let roleInstruction = '';
  switch (roleId) {
    case 'planner':
      roleInstruction =
        'You are an expert itinerary and route planner. You provide structured, time-efficient travel plans, walking/driving steps, transit advice, estimated distances, and sequencing.';
      break;
    case 'grounding':
      roleInstruction =
        'You are a real-time local intelligence fact-checker. You specialize in real-time operating hours, live events happening today/this week, current ticket prices, parking situation, and verified facts grounded in real-time Google search data.';
      break;
    case 'explorer':
    default:
      roleInstruction =
        'You are GeoChat, an enthusiastic, highly knowledgeable local guide and concierge. You know hidden gems, top culinary spots, cultural landmarks, vibrant neighborhoods, and scenic viewpoints.';
      break;
  }

  let mapContextInstruction = '';
  if (body.mapContext) {
    const ctx = body.mapContext;
    mapContextInstruction = `\nCURRENT MAP VIEWPORT & USER CONTEXT:
- Center Coordinates: Latitude ${ctx.center?.lat ?? 37.7749}, Longitude ${ctx.center?.lng ?? -122.4194}
- Current Zoom Level: ${ctx.zoom ?? 13}
${ctx.locationName ? `- Current Visible Area / City: ${ctx.locationName}` : ''}
${
  ctx.selectedPlace
    ? `- Currently Selected Pin on Map: "${ctx.selectedPlace.name}" at (${ctx.selectedPlace.lat}, ${ctx.selectedPlace.lng}) ${ctx.selectedPlace.address ? `[Address: ${ctx.selectedPlace.address}]` : ''}`
    : ''
}
Take this geographic context into account. When the user says "here", "nearby", "around this area", or "show me on the map", orient your answer around these coordinates and the surrounding area.`;
  }

  const outputFormattingInstruction = `\nINTERACTIVE MAP PIN REQUIREMENT:
When you recommend, highlight, or discuss specific physical venues, attractions, restaurants, parks, or points of interest that can be plotted on the map, provide your natural conversational text first.
At the very end of your response, output a structured JSON codeblock with language tag "json:places" containing the places you recommended, so they are dynamically rendered as interactive pins on the user's Google Map.
Format:
\`\`\`json:places
[
  {
    "id": "unique-slug-or-id",
    "name": "Official Place Name",
    "category": "restaurant" | "cafe" | "landmark" | "museum" | "park" | "hotel" | "transit" | "shopping" | "other",
    "lat": 37.774929,
    "lng": -122.419416,
    "description": "Short engaging 1-sentence highlight",
    "address": "Street address or neighborhood",
    "rating": 4.6
  }
]
\`\`\`
If no specific locations are recommended (e.g. general questions or conversational chit-chat), omit the \`\`\`json:places block. Ensure coordinates are accurate for the specific city or neighborhood discussed.`;

  const systemInstruction = `${roleInstruction}
${mapContextInstruction}
${outputFormattingInstruction}
Use Google Search Grounding to provide real-time, up-to-date, and accurate information about venues, current hours, events, and reviews. Format your answer with clean Markdown (headings, bullet points, bolding).`;

  // Format messages into Gemini contents format
  // Contents is array of { role: 'user' | 'model', parts: [{ text: string }] }
  const contents = body.messages.map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Build tools configuration
  const tools: Array<{ googleSearch: Record<string, never> }> = [];
  if (useSearch) {
    tools.push({ googleSearch: {} });
  }

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      },
    });
  } catch (err: unknown) {
    const errorStr = String((err as any)?.message || err);
    // If search grounding was enabled and threw a 429 / quota error, retry cleanly without search grounding tool
    if (useSearch && tools.length > 0 && (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED'))) {
      console.warn('Google Search Grounding quota reached or rate-limited; falling back to direct model knowledge generation.');
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });
    } else {
      throw err;
    }
  }

  const fullText = response.text || '';

  // Extract json:places block if present
  let cleanText = fullText;
  const places: PlaceMarker[] = [];
  const placesMatch = fullText.match(/```json:places\s*([\s\S]*?)\s*```/);

  if (placesMatch && placesMatch[1]) {
    try {
      const parsed = JSON.parse(placesMatch[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((p, idx) => {
          if (p && typeof p.lat === 'number' && typeof p.lng === 'number' && p.name) {
            places.push({
              id: p.id || `place-${Date.now()}-${idx}`,
              name: String(p.name),
              category: p.category || 'landmark',
              lat: Number(p.lat),
              lng: Number(p.lng),
              description: String(p.description || ''),
              address: p.address ? String(p.address) : undefined,
              rating: typeof p.rating === 'number' ? p.rating : undefined,
            });
          }
        });
      }
      cleanText = fullText.replace(/```json:places[\s\S]*?```/, '').trim();
    } catch (e) {
      console.warn('Failed to parse json:places block:', e);
    }
  }

  // Extract grounding sources & queries
  const groundingSources: GroundingSource[] = [];
  const searchQueries: string[] = [];

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const candidate = candidates[0];
    const groundingMetadata = candidate.groundingMetadata;

    if (groundingMetadata) {
      // Extract web search queries
      if (groundingMetadata.webSearchQueries && Array.isArray(groundingMetadata.webSearchQueries)) {
        searchQueries.push(...groundingMetadata.webSearchQueries);
      }

      // Extract sources
      if (groundingMetadata.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        const seenUrls = new Set<string>();
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web && chunk.web.uri) {
            if (!seenUrls.has(chunk.web.uri)) {
              seenUrls.add(chunk.web.uri);
              groundingSources.push({
                title: chunk.web.title || chunk.web.uri,
                uri: chunk.web.uri,
              });
            }
          }
        }
      }
    }
  }

  return {
    text: cleanText,
    places,
    groundingSources,
    searchQueries,
    modelUsed: model,
  };
}
