/**
 * NVIDIA NIM (NVIDIA Inference Microservices) API client.
 * Uses NVIDIA's hosted API endpoint via fetch.
 */
class NvidiaAIService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_NVIDIA_API_KEY || '';
    this.baseURL = 'https://integrate.api.nvidia.com/v1';
    this.model = 'nvidia/nemotron-4-340b-instruct';
  }

  /**
   * Checks if the NVIDIA API key is configured.
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Helper to make a request to NVIDIA's chat completions API.
   */
  async generateChat(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stream?: boolean;
      systemPrompt?: string;
    }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY is not configured');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          max_tokens: options?.maxTokens ?? 2048,
          stream: options?.stream ?? false,
        }),
      });

      if (response.status === 401) {
        throw new Error('Invalid NVIDIA API key');
      }

      if (response.status === 429) {
        throw new Error('Rate limited by NVIDIA API. Please try again later.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'AI generation failed');
      }

      const data = await response.json();

      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }

      throw new Error('No content returned from NVIDIA API');
    } catch (error: any) {
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error connecting to NVIDIA API');
      }
      throw error;
    }
  }

  /**
   * Parses a JSON string that may be wrapped in markdown fences.
   */
  safeParseJSON(text: string): any {
    // Remove markdown code fences if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      return JSON.parse(cleanText);
    } catch {
      return null;
    }
  }

  /**
   * Generates structured content using NVIDIA API with schema validation.
   */
  async generateWithSchema(
    prompt: string,
    schemaDescription: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<any> {
    const systemPrompt = `You are an educational AI assistant. Generate valid JSON matching the following schema. Do NOT include markdown fences or explanations. Schema: ${schemaDescription}`;

    const response = await this.generateChat(prompt, {
      systemPrompt,
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 4096,
    });

    const parsed = this.safeParseJSON(response);
    if (!parsed) {
      throw new Error('Failed to parse AI response as JSON');
    }

    return parsed;
  }
}

export const nvidiaAIService = new NvidiaAIService();

// Re-export common AI types
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
