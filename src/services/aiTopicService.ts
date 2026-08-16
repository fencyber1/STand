import { nvidiaAIService } from './nvidiaAIService';
import { TopicContent } from '../types/classroom';

/**
 * AI Topic Engine - generates complete topic content using NVIDIA API.
 * Grounded in teacher-provided material.
 */
class AITopicEngine {
  /**
   * Generates comprehensive topic content from teacher-provided material.
   */
  async generateTopicContent(
    topicTitle: string,
    sourceText: string,
    options?: {
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      targetAudience?: string;
      customInstructions?: string;
    }
  ): Promise<TopicContent> {
    const difficulty = options?.difficulty ?? 'beginner';
    const audience = options?.targetAudience ?? 'nursing students';
    const instructions = options?.customInstructions ?? '';

    // Combine teacher material with topic title
    const context = sourceText || topicTitle;

    const prompt = `
You are an educational AI assistant specializing in creating comprehensive learning materials.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${context.substring(0, 6000)} // Truncate to avoid exceeding limits

Generate a detailed JSON response with the following structure. Include ALL fields:

{
  "introduction": "A compelling opening that introduces the topic and its importance",
  "learningObjectives": ["List 5-7 specific, measurable learning objectives"],
  "keyTerminology": [
    {"term": "Term name", "definition": "Clear definition"}
  ],
  "lesson": {
    "simple": "Simple, beginner-friendly explanation using analogies and clear language",
    "detailed": "Detailed, comprehensive explanation with technical depth"
  },
  "simpleExplanation": "Even simpler version for struggling students - very basic language",
  "advancedExplanation": "Advanced explanation for high-performing students - technical and detailed",
  "examples": [
    {
      "title": "Example name",
      "description": "Detailed example",
      "type": "basic" | "intermediate" | "advanced"
    }
  ],
  "realWorldApplications": ["3-5 real-world applications of this topic"],
  "caseStudies": [
    {
      "id": "cs1",
      "title": "Case study title",
      "scenario": "Detailed scenario description",
      "questions": ["Question 1", "Question 2"],
      "learningOutcomes": ["What the student learns"]
    }
  ],
  "interactiveActivities": [
    {
      "id": "act1",
      "type": "drag_drop" | "matching" | "simulation" | "quiz",
      "title": "Activity title",
      "content": {"instructions": "How to do it", "items": []}
    }
  ],
  "knowledgeChecks": [
    {
      "id": "kc1",
      "question": "Knowledge check question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why this is correct",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "practiceQuestions": [
    {
      "id": "pq1",
      "text": "Practice question",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Explanation of the answer",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "revisionNotes": "Key points for quick revision - bullet format preferred",
  "summary": "Concise summary of the entire topic",
  "additionalResources": [
    {"title": "Resource name", "url": "https://...", "type": "article" | "video" | "document" | "link"}
  ]
}

Return ONLY valid JSON. Do not add any explanatory text.`;

    const result = await nvidiaAIService.generateChat(prompt, {
      systemPrompt: `You are an expert educational content creator. Your output must always be valid JSON matching the requested schema exactly. Never add explanatory text outside the JSON.`,
      temperature: 0.4,
      maxTokens: 8192,
      topP: 0.9,
    });

    const parsed = nvidiaAIService.safeParseJSON(result);

    if (!parsed) {
      throw new Error('Failed to parse AI topic generation response');
    }

    // Validate required fields
    const requiredFields = [
      'introduction', 'learningObjectives', 'keyTerminology', 'lesson',
      'simpleExplanation', 'advancedExplanation', 'examples',
      'realWorldApplications', 'caseStudies', 'interactiveActivities',
      'knowledgeChecks', 'practiceQuestions', 'revisionNotes', 'summary',
      'additionalResources'
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        console.warn(`AI response missing field: ${field}`);
        parsed[field] = this.getDefaultField(field);
      }
    }

    return parsed as TopicContent;
  }

  /**
   * Regenerates a specific section of topic content.
   */
  async regenerateSection(
    sectionName: string,
    topicTitle: string,
    existingContent: TopicContent,
    sourceText: string,
    customPrompt?: string
  ): Promise<any> {
    const prompt = `
You are regenerating a section of educational content.

TOPIC: "${topicTitle}"
SECTION: "${sectionName}"
SOURCE MATERIAL: ${sourceText.substring(0, 3000)}

EXISTING CONTENT:
${JSON.stringify(existingContent[sectionName as keyof TopicContent])}

${customPrompt ? `CUSTOM INSTRUCTIONS: ${customPrompt}` : ''}

Regenerate just this section. Return only the content for this section (or JSON if it's a complex object).
DO NOT include markdown fences or explanatory text.`;

    const result = await nvidiaAIService.generateChat(prompt, {
      systemPrompt: `You are an educational AI assistant. Return only the content without explanation or markdown.`,
      temperature: 0.5,
      maxTokens: 4096,
    });

    // Try to parse as JSON; if not, return as string
    const parsed = nvidiaAIService.safeParseJSON(result);
    return parsed ?? result;
  }

  /**
   * Generates a quiz based on a topic.
   */
  async generateQuiz(
    topicTitle: string,
    content: string,
    questionCount: number
  ): Promise<any> {
    const prompt = `
Generate ${questionCount} quiz questions based on the following educational topic.

TOPIC: "${topicTitle}"
CONTENT: ${content.substring(0, 3000)}

For each question, provide:
- Question text
- 4 multiple choice options
- The correct answer
- Difficulty (easy/medium/hard)
- Explanation

Return as valid JSON array. Include variety in difficulty levels.
DO NOT include markdown fences.`;

    const result = await nvidiaAIService.generateChat(prompt, {
      systemPrompt: `You are a quiz generator. Return only valid JSON array.`,
      temperature: 0.3,
      maxTokens: 8192,
    });

    const parsed = nvidiaAIService.safeParseJSON(result);
    if (!parsed) {
      throw new Error('Failed to parse quiz generation response');
    }

    return parsed;
  }

  /**
   * Generates practice questions with varying difficulty.
   */
  async generatePracticeQuestions(
    topicTitle: string,
    content: string,
    count: number,
    weakAreas?: string[]
  ): Promise<any> {
    const weakAreasPrompt = weakAreas && weakAreas.length > 0
      ? `\nFocus on these weak areas: ${weakAreas.join(', ')}.`
      : '';

    const prompt = `
Generate ${count} practice questions based on "${topicTitle}".
CONTENT: ${content.substring(0, 3000)}
${weakAreasPrompt}

Each question should include:
- Text
- Options (4 choices)
- Correct answer
- Explanation
- Difficulty level (evenly distributed across easy/medium/hard)

Return as valid JSON array. No markdown.`;

    const result = await nvidiaAIService.generateChat(prompt, {
      systemPrompt: `You are an educational practice question generator.`,
      temperature: 0.4,
      maxTokens: 8192,
    });

    const parsed = nvidiaAIService.safeParseJSON(result);
    if (!parsed) {
      throw new Error('Failed to parse practice questions response');
    }

    return parsed;
  }

  /**
   * Provides default values for missing fields.
   */
  private getDefaultField(field: string): any {
    const defaults: Record<string, any> = {
      introduction: '',
      learningObjectives: [],
      keyTerminology: [],
      lesson: { simple: '', detailed: '' },
      simpleExplanation: '',
      advancedExplanation: '',
      examples: [],
      realWorldApplications: [],
      caseStudies: [],
      interactiveActivities: [],
      knowledgeChecks: [],
      practiceQuestions: [],
      revisionNotes: '',
      summary: '',
      additionalResources: [],
    };

    return defaults[field] ?? '';
  }
}

export const aiTopicEngine = new AITopicEngine();
