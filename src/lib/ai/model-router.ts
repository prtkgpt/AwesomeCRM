import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  TaskType,
  ModelConfig,
  AIResponse,
  Provider,
  ChatMessage,
} from "./types";
import { getSystemPrompt } from "./prompts";

// Model routing configuration - cost-optimized
const MODEL_ROUTING: Record<TaskType, ModelConfig> = {
  intent_classification: {
    provider: "openai",
    model: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    maxTokens: 200,
  },
  entity_extraction: {
    provider: "openai",
    model: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    maxTokens: 200,
  },
  pricing_suggestion: {
    provider: "google",
    model: "gemini-2.0-flash",
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
    maxTokens: 500,
  },
  chat_response: {
    provider: "google",
    model: "gemini-2.0-flash",
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
    maxTokens: 1000,
  },
  business_insights: {
    provider: "google",
    model: "gemini-2.0-flash",
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
    maxTokens: 1500,
  },
  campaign_generation: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
    maxTokens: 2000,
  },
  complex_analysis: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
    maxTokens: 2000,
  },
  voice_command: {
    provider: "openai",
    model: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    maxTokens: 200,
  },
};

export class AIModelRouter {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private google: GoogleGenerativeAI | null = null;

  constructor() {
    // Lazy initialization - only create clients when needed
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  /**
   * Get the model configuration for a specific task type
   */
  getConfig(taskType: TaskType): ModelConfig {
    return MODEL_ROUTING[taskType];
  }

  /**
   * Calculate estimated cost for a request
   */
  calculateCost(
    taskType: TaskType,
    inputTokens: number,
    outputTokens: number
  ): number {
    const config = MODEL_ROUTING[taskType];
    const inputCost = (inputTokens / 1_000_000) * config.costPer1MInput;
    const outputCost = (outputTokens / 1_000_000) * config.costPer1MOutput;
    return inputCost + outputCost;
  }

  /**
   * Main completion method - routes to appropriate provider
   */
  async complete(
    taskType: TaskType,
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    const config = MODEL_ROUTING[taskType];
    const systemPrompt =
      options?.systemPrompt || getSystemPrompt(taskType);
    const maxTokens = options?.maxTokens || config.maxTokens;

    switch (config.provider) {
      case "openai":
        return this.completeOpenAI(
          config.model,
          prompt,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      case "google":
        return this.completeGoogle(
          config.model,
          prompt,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      case "anthropic":
        return this.completeAnthropic(
          config.model,
          prompt,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Chat completion with message history
   */
  async chat(
    taskType: TaskType,
    messages: ChatMessage[],
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    const config = MODEL_ROUTING[taskType];
    const systemPrompt = options?.systemPrompt || getSystemPrompt("chat");
    const maxTokens = options?.maxTokens || config.maxTokens;

    switch (config.provider) {
      case "openai":
        return this.chatOpenAI(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      case "google":
        return this.chatGoogle(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      case "anthropic":
        return this.chatAnthropic(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Stream a response (for chat interface)
   */
  async *stream(
    taskType: TaskType,
    messages: ChatMessage[],
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    const config = MODEL_ROUTING[taskType];
    const systemPrompt = options?.systemPrompt || getSystemPrompt("chat");
    const maxTokens = options?.maxTokens || config.maxTokens;

    switch (config.provider) {
      case "openai":
        yield* this.streamOpenAI(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
        break;
      case "google":
        yield* this.streamGoogle(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
        break;
      case "anthropic":
        yield* this.streamAnthropic(
          config.model,
          messages,
          systemPrompt,
          maxTokens,
          options?.temperature
        );
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  // ============================================
  // OpenAI Methods
  // ============================================

  private async completeOpenAI(
    model: string,
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized. Set OPENAI_API_KEY.");
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        ...(systemPrompt
          ? [{ role: "system" as const, content: systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: temperature ?? 0.7,
    });

    return {
      content: response.choices[0].message.content || "",
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      provider: "openai",
      model,
    };
  }

  private async chatOpenAI(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized. Set OPENAI_API_KEY.");
    }

    const openAIMessages = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const response = await this.openai.chat.completions.create({
      model,
      messages: openAIMessages,
      max_tokens: maxTokens,
      temperature: temperature ?? 0.7,
    });

    return {
      content: response.choices[0].message.content || "",
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      provider: "openai",
      model,
    };
  }

  private async *streamOpenAI(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized. Set OPENAI_API_KEY.");
    }

    const openAIMessages = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const stream = await this.openai.chat.completions.create({
      model,
      messages: openAIMessages,
      max_tokens: maxTokens,
      temperature: temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // ============================================
  // Google Methods
  // ============================================

  private async completeGoogle(
    model: string,
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.google) {
      throw new Error("Google AI client not initialized. Set GOOGLE_AI_API_KEY.");
    }

    const genModel = this.google.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });

    const result = await genModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature ?? 0.7,
      },
    });

    const response = result.response;
    const usageMetadata = response.usageMetadata;

    return {
      content: response.text(),
      usage: {
        inputTokens: usageMetadata?.promptTokenCount,
        outputTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
      },
      provider: "google",
      model,
    };
  }

  private async chatGoogle(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.google) {
      throw new Error("Google AI client not initialized. Set GOOGLE_AI_API_KEY.");
    }

    const genModel = this.google.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });

    // Convert messages to Google format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({
      history: history as Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature ?? 0.7,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const usageMetadata = response.usageMetadata;

    return {
      content: response.text(),
      usage: {
        inputTokens: usageMetadata?.promptTokenCount,
        outputTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
      },
      provider: "google",
      model,
    };
  }

  private async *streamGoogle(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): AsyncGenerator<string, void, unknown> {
    if (!this.google) {
      throw new Error("Google AI client not initialized. Set GOOGLE_AI_API_KEY.");
    }

    const genModel = this.google.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });

    // Convert messages to Google format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({
      history: history as Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature ?? 0.7,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  // ============================================
  // Anthropic Methods
  // ============================================

  private async completeAnthropic(
    model: string,
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized. Set ANTHROPIC_API_KEY.");
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens || 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature ?? 0.7,
    });

    const textContent = response.content.find((c) => c.type === "text");

    return {
      content: textContent?.type === "text" ? textContent.text : "",
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
      provider: "anthropic",
      model,
    };
  }

  private async chatAnthropic(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized. Set ANTHROPIC_API_KEY.");
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens || 1024,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature: temperature ?? 0.7,
    });

    const textContent = response.content.find((c) => c.type === "text");

    return {
      content: textContent?.type === "text" ? textContent.text : "",
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
      provider: "anthropic",
      model,
    };
  }

  private async *streamAnthropic(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number
  ): AsyncGenerator<string, void, unknown> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized. Set ANTHROPIC_API_KEY.");
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = this.anthropic.messages.stream({
      model,
      max_tokens: maxTokens || 1024,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature: temperature ?? 0.7,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}

// Singleton instance
let routerInstance: AIModelRouter | null = null;

export function getAIRouter(): AIModelRouter {
  if (!routerInstance) {
    routerInstance = new AIModelRouter();
  }
  return routerInstance;
}

export { MODEL_ROUTING };
