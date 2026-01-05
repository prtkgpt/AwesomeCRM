// AI Types for CleanDay AI Copilot

export type Provider = "anthropic" | "openai" | "google";

export type TaskType =
  | "intent_classification"
  | "entity_extraction"
  | "pricing_suggestion"
  | "chat_response"
  | "business_insights"
  | "campaign_generation"
  | "complex_analysis"
  | "voice_command";

export interface ModelConfig {
  provider: Provider;
  model: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  maxTokens: number;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  provider: Provider;
  model: string;
  cost?: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface AIAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface AIChatResponse {
  message: string;
  actions?: AIAction[];
  intent?: string;
  metadata?: Record<string, unknown>;
}

export type InsightQuery =
  | "revenue_summary"
  | "top_customers"
  | "cleaner_performance"
  | "cancellation_analysis"
  | "revenue_comparison"
  | "upcoming_schedule"
  | "overdue_invoices"
  | "lapsed_clients";

export interface InsightResult {
  query: InsightQuery;
  data: Record<string, unknown>;
  summary: string;
  actions?: AIAction[];
}

export interface PricingInput {
  serviceType: "STANDARD" | "DEEP" | "MOVE_OUT";
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  frequency?: "one_time" | "weekly" | "biweekly" | "monthly";
  extras?: string[];
  location?: {
    city: string;
    state: string;
    zip: string;
  };
}

export interface PricingSuggestion {
  suggestedPrice: number;
  priceRange: {
    low: number;
    high: number;
  };
  breakdown: {
    base: number;
    sizeAdjustment: number;
    frequencyDiscount: number;
    extras: number;
  };
  confidence: number;
  reasoning: string;
}
