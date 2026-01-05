# CleanDay AI Copilot - Implementation Prompt

**For use with Claude Code to build the AI Copilot features**

---

## Project Context

You are building an AI Copilot for CleanDayCRM, a cleaning business management software. The codebase is a Next.js 14 application with:

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **SMS**: Twilio
- **Email**: Resend
- **Styling**: Tailwind CSS

We have historical data of **1,500+ completed cleanings from 2025** that can be used to train pricing models and generate insights.

---

## Implementation Overview

Build the AI Copilot in **3 phases**:

### Phase 1: Foundation (Week 1-2)
- [ ] Claude API integration
- [ ] AI chat interface
- [ ] Basic business insights queries
- [ ] Analytics caching layer

### Phase 2: Core Features (Week 3-4)
- [ ] Smart Pricing Engine
- [ ] Campaign Copy Generator
- [ ] Automated Recommendations

### Phase 3: Advanced (Week 5-6)
- [ ] Voice commands (mobile PWA)
- [ ] Schedule optimization
- [ ] Proactive notifications

---

## Phase 1: Foundation

### Task 1.1: Claude API Integration

Create a reusable AI service for interacting with Claude.

**File: `src/lib/ai/claude.ts`**

```typescript
// Requirements:
// 1. Create a ClaudeService class that wraps the Anthropic SDK
// 2. Include rate limiting (max 50 requests/minute per company)
// 3. Include cost tracking (log token usage per company)
// 4. Support streaming responses for chat interface
// 5. Include retry logic with exponential backoff
// 6. Use claude-3-5-sonnet for most tasks, claude-3-haiku for simple classification

// System prompt should include:
// - CleanDayCRM context (cleaning business software)
// - Available actions the AI can take
// - Response format guidelines
// - Cleaning industry knowledge
```

**Environment variables needed:**
```
ANTHROPIC_API_KEY=sk-ant-...
AI_RATE_LIMIT_PER_MINUTE=50
AI_COST_TRACKING_ENABLED=true
```

---

### Task 1.2: AI Chat Interface

Build a chat widget that appears on the admin dashboard.

**Requirements:**

1. **UI Component**: `src/components/ai/AIChatWidget.tsx`
   - Floating button in bottom-right corner
   - Expandable chat panel (400px wide, 500px tall)
   - Message history with user/AI distinction
   - Typing indicator while AI responds
   - Suggested prompts for new users
   - Minimize/close buttons

2. **API Route**: `src/app/api/ai/chat/route.ts`
   - POST endpoint for sending messages
   - Stream responses using Server-Sent Events
   - Include conversation history (last 10 messages)
   - Inject company context (name, settings, recent stats)

3. **Suggested Prompts** (show when chat is empty):
   ```
   - "How's my business doing this month?"
   - "Who are my best customers?"
   - "Help me create a marketing campaign"
   - "What should I charge for a 3BR deep clean?"
   - "Show me today's schedule"
   ```

4. **Action Buttons**: When AI suggests an action, render clickable buttons:
   ```typescript
   // AI response format for actions:
   {
     message: "I found 12 lapsed clients. Want me to create a win-back campaign?",
     actions: [
       { label: "Create Campaign", action: "create_campaign", params: { type: "winback" } },
       { label: "View Clients", action: "navigate", params: { path: "/clients?filter=lapsed" } }
     ]
   }
   ```

---

### Task 1.3: Business Insights Queries

Enable natural language questions about business data.

**API Route**: `src/app/api/ai/insights/route.ts`

**Supported Query Types:**

```typescript
type InsightQuery =
  | "revenue_summary"      // "How's my business doing?"
  | "top_customers"        // "Who are my best customers?"
  | "cleaner_performance"  // "How is Maria doing?"
  | "cancellation_analysis"// "Why are we getting cancellations?"
  | "revenue_comparison"   // "Compare this month to last month"
  | "upcoming_schedule"    // "What's on the schedule today?"
  | "overdue_invoices"     // "Who owes me money?"
  | "lapsed_clients"       // "Which clients haven't booked recently?"
```

**Implementation:**

1. Create an intent classifier that maps natural language to query types
2. For each query type, create a data fetcher that pulls relevant metrics
3. Pass the data to Claude with instructions to summarize in plain English
4. Include actionable suggestions with each response

**Example Flow:**
```
User: "How did we do last month?"

1. Classify intent → "revenue_summary" + period: "last_month"

2. Fetch data:
   - Total revenue: $12,450
   - Jobs completed: 87
   - New clients: 12
   - Cancellations: 5
   - Top cleaner: Maria (32 jobs)
   - Comparison to previous month: +15%

3. Send to Claude with prompt:
   "Summarize this business data in 2-3 sentences. Be specific with numbers.
    Highlight anything notable (good or concerning). Suggest one action."

4. Return:
   "Last month was strong! You earned $12,450 from 87 jobs—up 15% from
    the previous month. Maria was your top performer with 32 jobs. You had
    5 cancellations, which is slightly higher than usual. Consider sending
    a confirmation reminder to reduce no-shows. [View Cancellations]"
```

---

### Task 1.4: Analytics Caching Layer

Pre-compute common metrics to speed up AI responses.

**Database Schema Addition:**

```prisma
model AnalyticsCache {
  id          String   @id @default(cuid())
  companyId   String
  metricType  String   // "daily_revenue", "weekly_summary", "client_ltv", etc.
  periodStart DateTime
  periodEnd   DateTime
  data        Json     // Cached metric data
  computedAt  DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, metricType, periodStart, periodEnd])
  @@index([companyId, metricType])
}
```

**Metrics to Cache (refresh daily via cron):**

```typescript
const CACHED_METRICS = [
  "daily_revenue",           // Revenue per day (last 90 days)
  "weekly_summary",          // Jobs, revenue, cancellations per week
  "monthly_comparison",      // Month-over-month metrics
  "client_ltv",              // Lifetime value per client
  "cleaner_performance",     // Jobs, ratings, on-time % per cleaner
  "service_type_breakdown",  // Revenue by service type
  "cancellation_reasons",    // Cancellation patterns
  "booking_source",          // Where clients come from
  "average_job_value",       // By service type, property size, location
];
```

**Cron Job**: `src/app/api/cron/compute-analytics/route.ts`
- Run daily at 2am
- Compute metrics for each active company
- Store in AnalyticsCache table
- Delete cache entries older than 90 days

---

## Phase 2: Core Features

### Task 2.1: Smart Pricing Engine

Build an AI-powered pricing suggestion system using our historical data.

**Training Data Available:**
- 1,500+ completed cleanings from 2025
- Fields: service_type, price, duration, sqft, bedrooms, bathrooms, property_type, zip_code, is_recurring, client_type (new/repeat)

**Implementation:**

1. **Data Analysis Script**: `scripts/analyze-pricing-data.ts`
   ```typescript
   // Analyze the 1500 cleanings to find:
   // - Average price by service type
   // - Price per sqft by service type
   // - Price adjustments for: bedrooms, bathrooms, property type
   // - Geographic price variations (by zip code prefix)
   // - New vs repeat customer pricing patterns
   // - Seasonal variations

   // Output: pricing_model.json with coefficients
   ```

2. **Pricing Model**: `src/lib/ai/pricing-model.ts`
   ```typescript
   interface PricingInput {
     serviceType: "STANDARD" | "DEEP_CLEAN" | "MOVE_OUT";
     sqft: number;
     bedrooms: number;
     bathrooms: number;
     propertyType: "HOUSE" | "APARTMENT" | "CONDO" | "TOWNHOUSE";
     zipCode: string;
     isNewCustomer: boolean;
     isRecurring: boolean;
   }

   interface PricingOutput {
     suggestedPrice: number;
     priceRange: { min: number; max: number };
     confidence: number; // 0-100
     reasoning: string[];
     comparisons: {
       yourAverage: number;
       marketRate: number;
       similarJobs: { price: number; details: string }[];
     };
     upsellSuggestions: { name: string; price: number; attachRate: number }[];
   }

   function suggestPrice(input: PricingInput): PricingOutput
   ```

3. **API Route**: `src/app/api/ai/suggest-price/route.ts`
   - POST with property details
   - Returns pricing suggestion with reasoning
   - Logs suggestion vs actual price chosen (for model improvement)

4. **UI Integration**: Add pricing suggestion to:
   - New booking form
   - Estimate creation page
   - Booking widget configuration

**Pricing UI Component**: `src/components/ai/PricingSuggestion.tsx`
```
┌─────────────────────────────────────────────────────────────────┐
│  💡 AI Price Suggestion                                         │
│  ─────────────────────────────────────────────────────────────  │
│  Recommended: $175 - $195                                       │
│  Confidence: 87%                                                │
│                                                                 │
│  Based on:                                                      │
│  • Your average for 3BR deep clean: $165                       │
│  • Market rate for 90210: $180-$200                            │
│  • Similar jobs: $170, $185, $190                              │
│                                                                 │
│  💰 Upsell opportunities:                                      │
│  □ Inside fridge (+$35) - 60% attach rate                      │
│  □ Inside oven (+$30) - 45% attach rate                        │
│                                                                 │
│  [Use $185]  [Use $175 + Upsells]  [Custom]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Task 2.2: Campaign Copy Generator

Build AI-powered marketing campaign creation.

**API Route**: `src/app/api/ai/generate-campaign/route.ts`

**Input:**
```typescript
interface CampaignRequest {
  goal: "winback" | "upsell" | "seasonal" | "referral" | "announcement";
  targetAudience: {
    type: "all" | "lapsed" | "one_time" | "recurring" | "custom";
    customFilter?: {
      lastBookingDaysAgo?: number;
      serviceTypes?: string[];
      minLifetimeValue?: number;
    };
  };
  offer?: {
    type: "percent" | "fixed" | "free_addon" | "none";
    value?: number;
    addonName?: string;
  };
  tone: "professional" | "friendly" | "urgent" | "casual";
  channels: ("email" | "sms")[];
  seasonalTheme?: "spring" | "holiday" | "summer" | "back_to_school";
}
```

**Output:**
```typescript
interface CampaignContent {
  email?: {
    subjectLines: string[]; // 3 options
    body: string;           // With {{variables}}
    ctaText: string;
  };
  sms?: {
    message: string;        // Under 160 chars with {{variables}}
  };
  coupon?: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    expiresAt: Date;
    restrictions: string[];
  };
  audienceCount: number;
  suggestedSendTime: Date;
  previewRecipients: { name: string; email: string }[]; // 3 samples
}
```

**Claude Prompt Template:**
```
You are a marketing copywriter for a cleaning business. Write campaign content
for the following request:

Goal: {{goal}}
Target: {{audienceDescription}} ({{audienceCount}} recipients)
Offer: {{offerDescription}}
Tone: {{tone}}
Channels: {{channels}}

Requirements:
- Subject lines should be under 50 characters, compelling, use emoji sparingly
- Email body should be under 150 words, focus on benefits not features
- Include clear call-to-action
- SMS must be under 160 characters including the link placeholder {{bookingLink}}
- Use these variables: {{firstName}}, {{companyName}}, {{bookingLink}}, {{couponCode}}
- If seasonal, reference the season naturally

Output as JSON matching the CampaignContent interface.
```

**UI Component**: `src/components/ai/CampaignGenerator.tsx`
- Step-by-step wizard (goal → audience → offer → tone → preview)
- Real-time preview of generated content
- Edit capability before sending
- Auto-create coupon if offer included
- Schedule or send immediately

---

### Task 2.3: Automated Recommendations Feed

Build a smart recommendations system that proactively suggests actions.

**Database Schema:**

```prisma
model AIRecommendation {
  id           String   @id @default(cuid())
  companyId    String
  type         String   // "winback", "follow_up", "pricing", "schedule", etc.
  priority     String   // "high", "medium", "low"
  title        String
  description  String
  actionType   String   // "create_campaign", "send_reminder", "navigate", etc.
  actionParams Json
  status       String   @default("pending") // "pending", "completed", "dismissed"
  expiresAt    DateTime?
  createdAt    DateTime @default(now())
  completedAt  DateTime?
  dismissedAt  DateTime?

  company      Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, status])
}
```

**Recommendation Triggers:**

```typescript
const RECOMMENDATION_TRIGGERS = [
  {
    type: "lapsed_clients",
    check: "clients with no booking in 30+ days",
    threshold: 5, // Minimum clients to trigger
    priority: "high",
    title: "{{count}} clients haven't booked in 30+ days",
    action: { type: "create_campaign", params: { goal: "winback" } }
  },
  {
    type: "pending_estimates",
    check: "estimates sent 3+ days ago, not booked",
    threshold: 1,
    priority: "high",
    title: "Follow up on {{count}} pending estimate(s)",
    action: { type: "send_followup", params: { templateType: "estimate_reminder" } }
  },
  {
    type: "overdue_invoices",
    check: "invoices overdue 3+ days",
    threshold: 1,
    priority: "high",
    title: "{{count}} invoice(s) overdue ({{total}})",
    action: { type: "send_reminder", params: { templateType: "payment_reminder" } }
  },
  {
    type: "unassigned_jobs",
    check: "jobs in next 48 hours without cleaner",
    threshold: 1,
    priority: "high",
    title: "{{count}} upcoming job(s) need assignment",
    action: { type: "navigate", params: { path: "/jobs?filter=unassigned" } }
  },
  {
    type: "review_request",
    check: "5-star internal reviews without Google review request",
    threshold: 1,
    priority: "medium",
    title: "Ask {{clientName}} for a Google review",
    action: { type: "send_review_request", params: { clientId: "..." } }
  },
  {
    type: "cleaner_performance",
    check: "cleaner late 3+ times this week",
    threshold: 1,
    priority: "medium",
    title: "Review {{cleanerName}}'s schedule - {{count}} late arrivals",
    action: { type: "navigate", params: { path: "/team/{{cleanerId}}" } }
  },
  {
    type: "revenue_drop",
    check: "revenue down 20%+ vs last week",
    threshold: 1,
    priority: "medium",
    title: "Revenue down {{percent}}% this week",
    action: { type: "create_campaign", params: { goal: "seasonal" } }
  },
  {
    type: "recurring_upgrade",
    check: "one-time customers with 3+ bookings",
    threshold: 3,
    priority: "low",
    title: "{{count}} clients might convert to recurring",
    action: { type: "create_campaign", params: { goal: "upsell", audience: "frequent_onetime" } }
  }
];
```

**Cron Job**: `src/app/api/cron/generate-recommendations/route.ts`
- Run every hour
- Check each trigger for each company
- Create recommendations if threshold met
- Expire old recommendations (7 days)
- Don't create duplicate active recommendations

**UI Component**: `src/components/ai/RecommendationsFeed.tsx`
- Show on dashboard sidebar or dedicated section
- Group by priority (high at top)
- One-click action buttons
- Dismiss option with "don't show again for X days"
- Badge count in navigation

---

## Phase 3: Advanced Features

### Task 3.1: Voice Commands (Mobile)

Add voice interaction for cleaners in the field.

**Implementation using Web Speech API:**

**Component**: `src/components/ai/VoiceAssistant.tsx`

```typescript
// Voice commands to support:
const VOICE_COMMANDS = [
  {
    patterns: ["on my way", "heading to", "going to"],
    action: "on_my_way",
    requiresEntity: "client_name", // Optional: extract from speech
  },
  {
    patterns: ["i've arrived", "i'm here", "arrived at"],
    action: "clock_in",
  },
  {
    patterns: ["job complete", "i'm done", "finished", "all done"],
    action: "clock_out",
  },
  {
    patterns: ["what's my next job", "next appointment", "where am i going"],
    action: "get_next_job",
  },
  {
    patterns: ["gate code", "access code", "door code"],
    action: "get_access_code",
  },
  {
    patterns: ["call the client", "call customer"],
    action: "call_client",
  },
  {
    patterns: ["add a note", "make a note", "note that"],
    action: "add_note",
    requiresFollowUp: true, // Listen for note content
  },
  {
    patterns: ["special instructions", "any notes", "preferences"],
    action: "get_instructions",
  },
  {
    patterns: ["how many jobs", "jobs today", "schedule today"],
    action: "get_schedule_summary",
  },
  {
    patterns: ["there's a problem", "i need help", "issue"],
    action: "report_issue",
    requiresFollowUp: true, // Ask for issue type
  },
];
```

**Voice UI Flow:**
1. Tap microphone button (or wake word in future)
2. Show listening indicator with waveform
3. Transcribe speech in real-time
4. Match to command pattern
5. Execute action or ask for clarification
6. Speak response using Speech Synthesis
7. Show visual confirmation

**API Route**: `src/app/api/ai/voice-command/route.ts`
```typescript
interface VoiceCommandRequest {
  transcript: string;
  bookingId?: string; // Current job context
  cleanerId: string;
}

interface VoiceCommandResponse {
  action: string;
  success: boolean;
  spokenResponse: string; // Text to speak back
  visualResponse?: string; // Optional different text to display
  followUpRequired?: boolean;
  followUpPrompt?: string;
}
```

---

### Task 3.2: Schedule Optimization

Optimize cleaner routes to minimize drive time.

**API Route**: `src/app/api/ai/optimize-schedule/route.ts`

**Implementation Options:**

1. **Google Routes API** (Recommended for accuracy)
   ```typescript
   // Use Routes API to compute optimal order
   // Requires: GOOGLE_ROUTES_API_KEY
   ```

2. **OR-Tools** (Self-hosted, no API costs)
   ```typescript
   // Use Google OR-Tools via Python microservice
   // Better for complex constraints
   ```

**Input:**
```typescript
interface OptimizeScheduleRequest {
  date: Date;
  cleanerId: string;
  jobs: {
    bookingId: string;
    address: string;
    lat: number;
    lng: number;
    duration: number; // minutes
    timeWindow?: { start: string; end: string }; // Optional constraints
  }[];
  startLocation: { lat: number; lng: number }; // Cleaner's home/office
  endLocation?: { lat: number; lng: number }; // Where to end (default: start)
}
```

**Output:**
```typescript
interface OptimizeScheduleResponse {
  optimizedOrder: {
    bookingId: string;
    suggestedStartTime: Date;
    arrivalTime: Date;
    departureTime: Date;
    driveTimeFromPrevious: number; // minutes
  }[];
  totalDriveTime: number;
  totalDriveDistance: number; // miles
  savings: {
    timeMinutes: number;
    distanceMiles: number;
    comparedTo: "current" | "naive"; // What we're comparing against
  };
  mapUrl: string; // Link to Google Maps with route
}
```

**UI Integration:**
- Add "Optimize Route" button to daily schedule view
- Show before/after comparison
- One-click accept to update all booking times
- Send updated schedule to cleaner's phone

---

### Task 3.3: Proactive Notifications

Push AI-generated alerts to admins and cleaners.

**Notification Types:**

```typescript
const AI_NOTIFICATIONS = {
  admin: [
    {
      trigger: "morning_briefing",
      time: "08:00",
      template: "Good morning! Today: {{jobCount}} jobs (${{revenue}}). {{alerts}}"
    },
    {
      trigger: "cleaner_running_late",
      realtime: true,
      template: "{{cleanerName}} is running {{minutes}} min late for {{clientName}}"
    },
    {
      trigger: "high_value_lead",
      realtime: true,
      template: "New lead: {{clientName}} - {{serviceType}} (${{estimatedValue}})"
    },
    {
      trigger: "payment_received",
      realtime: true,
      template: "Payment received: ${{amount}} from {{clientName}}"
    },
  ],
  cleaner: [
    {
      trigger: "job_reminder",
      time: "-30min", // 30 min before job
      template: "Your {{time}} job at {{clientName}}'s is coming up. {{specialInstructions}}"
    },
    {
      trigger: "running_behind",
      realtime: true,
      template: "You're running {{minutes}} min behind. Want me to notify {{clientName}}?"
    },
    {
      trigger: "schedule_change",
      realtime: true,
      template: "Schedule update: {{changeDescription}}"
    },
  ],
  customer: [
    {
      trigger: "booking_confirmation",
      template: "Your cleaning is confirmed for {{date}} at {{time}} with {{cleanerName}}"
    },
    {
      trigger: "day_before_reminder",
      time: "-1day",
      template: "Reminder: Your cleaning is tomorrow at {{time}}. Reply RESCHEDULE to change."
    },
    {
      trigger: "on_the_way",
      realtime: true,
      template: "{{cleanerName}} is on the way! ETA: {{eta}} minutes"
    },
    {
      trigger: "cleaning_complete",
      realtime: true,
      template: "Your home is sparkling clean! How did we do? {{reviewLink}}"
    },
  ]
};
```

**Implementation:**
- Web push notifications for admin dashboard
- SMS for cleaners and customers
- In-app notification center with history
- Email digest option (daily/weekly summary)

---

## Database Migrations

Run these Prisma migrations:

```prisma
// Add to schema.prisma

model AIConversation {
  id         String   @id @default(cuid())
  companyId  String
  userId     String
  messages   Json     // Array of { role, content, timestamp }
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  company    Company  @relation(fields: [companyId], references: [id])
  user       User     @relation(fields: [userId], references: [id])

  @@index([companyId, userId])
}

model AIUsage {
  id             String   @id @default(cuid())
  companyId      String
  feature        String   // "chat", "pricing", "campaign", "insights"
  inputTokens    Int
  outputTokens   Int
  cost           Float    // USD
  createdAt      DateTime @default(now())

  company        Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, createdAt])
}

model AnalyticsCache {
  id          String   @id @default(cuid())
  companyId   String
  metricType  String
  periodStart DateTime
  periodEnd   DateTime
  data        Json
  computedAt  DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, metricType, periodStart, periodEnd])
  @@index([companyId, metricType])
}

model AIRecommendation {
  id           String    @id @default(cuid())
  companyId    String
  type         String
  priority     String
  title        String
  description  String
  actionType   String
  actionParams Json
  status       String    @default("pending")
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  completedAt  DateTime?
  dismissedAt  DateTime?

  company      Company   @relation(fields: [companyId], references: [id])

  @@index([companyId, status])
}

model PricingSuggestionLog {
  id             String   @id @default(cuid())
  companyId      String
  input          Json     // PricingInput
  suggestedPrice Float
  actualPrice    Float?   // What user chose
  accepted       Boolean?
  createdAt      DateTime @default(now())

  company        Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, createdAt])
}
```

---

## Cost-Effective Multi-Model Strategy

### Why Multi-Model?

Claude is expensive ($3-15/1M tokens). Use a **model router** to cut costs by 75%+ while maintaining quality.

### Model Selection by Task

| Task | Recommended Model | Cost | Why |
|------|-------------------|------|-----|
| Intent classification | GPT-4o mini | $0.15/$0.60 | Simple, high volume |
| Entity extraction | GPT-4o mini | $0.15/$0.60 | Pattern matching |
| Pricing suggestions | Gemini 2.0 Flash | $0.10/$0.40 | Fast, cheap |
| Chat responses | Gemini 2.5 Pro | $1.25/$5.00 | Good balance |
| Business insights | Gemini 2.5 Pro | $1.25/$5.00 | Analytical |
| Campaign copy | Claude Sonnet | $3/$15 | Best writing |
| Complex analysis | Claude Sonnet | $3/$15 | Best reasoning |
| Voice commands | GPT-4o mini | $0.15/$0.60 | Low latency |

### Model Router Implementation

**File: `src/lib/ai/model-router.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Provider = "anthropic" | "openai" | "google";
type TaskType =
  | "intent_classification"
  | "entity_extraction"
  | "pricing_suggestion"
  | "chat_response"
  | "business_insights"
  | "campaign_generation"
  | "complex_analysis"
  | "voice_command";

interface ModelConfig {
  provider: Provider;
  model: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  maxTokens: number;
}

const MODEL_ROUTING: Record<TaskType, ModelConfig> = {
  intent_classification: {
    provider: "openai",
    model: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    maxTokens: 100,
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
    model: "gemini-2.5-pro",
    costPer1MInput: 1.25,
    costPer1MOutput: 5.00,
    maxTokens: 1000,
  },
  business_insights: {
    provider: "google",
    model: "gemini-2.5-pro",
    costPer1MInput: 1.25,
    costPer1MOutput: 5.00,
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
  private anthropic: Anthropic;
  private openai: OpenAI;
  private google: GoogleGenerativeAI;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }

  async complete(taskType: TaskType, prompt: string, systemPrompt?: string) {
    const config = MODEL_ROUTING[taskType];

    switch (config.provider) {
      case "openai":
        return this.completeOpenAI(config.model, prompt, systemPrompt, config.maxTokens);
      case "google":
        return this.completeGoogle(config.model, prompt, systemPrompt, config.maxTokens);
      case "anthropic":
        return this.completeAnthropic(config.model, prompt, systemPrompt, config.maxTokens);
    }
  }

  private async completeOpenAI(model: string, prompt: string, system?: string, maxTokens?: number) {
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    });
    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      provider: "openai",
      model,
    };
  }

  private async completeGoogle(model: string, prompt: string, system?: string, maxTokens?: number) {
    const genModel = this.google.getGenerativeModel({ model });
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    const result = await genModel.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return {
      content: result.response.text(),
      usage: { /* estimate tokens */ },
      provider: "google",
      model,
    };
  }

  private async completeAnthropic(model: string, prompt: string, system?: string, maxTokens?: number) {
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens || 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return {
      content: response.content[0].type === "text" ? response.content[0].text : "",
      usage: response.usage,
      provider: "anthropic",
      model,
    };
  }
}
```

### Cost Comparison

| Strategy | Monthly Cost (100 companies) | Per Company |
|----------|------------------------------|-------------|
| All Claude Sonnet | $204 | $2.04 |
| All Claude Haiku | $68 | $0.68 |
| All GPT-4o | $150 | $1.50 |
| **Multi-Model (recommended)** | **$45** | **$0.45** |

### Cost Optimization Techniques

1. **Response Caching**: Cache common queries (Redis/Upstash)
2. **Prompt Caching**: Use Claude's 90% cache discount for repeated system prompts
3. **Batch API**: Use OpenAI's 50% batch discount for non-urgent tasks
4. **Token Optimization**: Compress context, use JSON responses

---

## Environment Variables

Add to `.env`:

```bash
# AI Configuration - Multi-Provider
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Model defaults (can be overridden per-task)
AI_MODEL_COMPLEX=claude-sonnet-4-20250514
AI_MODEL_MEDIUM=gemini-2.5-pro
AI_MODEL_SIMPLE=gpt-4o-mini

# Rate limiting
AI_RATE_LIMIT_PER_MINUTE=50
AI_MAX_TOKENS_PER_REQUEST=4096

# Cost tracking
AI_COST_TRACKING_ENABLED=true
AI_MONTHLY_BUDGET_ALERT=100  # Alert when approaching $100/mo

# Google APIs (for route optimization)
GOOGLE_ROUTES_API_KEY=...

# Feature Flags
FEATURE_AI_CHAT=true
FEATURE_AI_PRICING=true
FEATURE_AI_CAMPAIGNS=true
FEATURE_AI_VOICE=false  # Enable after Phase 3
```

---

## Testing

### Unit Tests

```typescript
// tests/ai/pricing-model.test.ts
describe("PricingModel", () => {
  it("suggests higher price for deep clean vs standard");
  it("adjusts price based on square footage");
  it("considers location in pricing");
  it("suggests upsells based on historical attach rates");
  it("provides confidence score based on data availability");
});

// tests/ai/intent-classifier.test.ts
describe("IntentClassifier", () => {
  it("classifies revenue questions correctly");
  it("extracts time period from queries");
  it("handles ambiguous queries gracefully");
});
```

### Integration Tests

```typescript
// tests/ai/chat-integration.test.ts
describe("AI Chat", () => {
  it("responds to business insights questions");
  it("maintains conversation context");
  it("includes action buttons when appropriate");
  it("respects rate limits");
});
```

---

## Success Metrics

Track these metrics to measure AI Copilot success:

1. **Adoption**
   - % of admins using chat weekly
   - Voice commands per cleaner per day
   - Campaign generator usage

2. **Accuracy**
   - Pricing suggestion acceptance rate
   - Intent classification accuracy
   - Recommendation completion rate

3. **Impact**
   - Time saved (survey + behavioral)
   - Revenue from AI-generated campaigns
   - Pricing improvement (actual vs suggested)

4. **Costs**
   - AI API costs per company per month
   - Target: < $3/company/month

---

## Getting Started

1. Install dependencies:
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev --name add_ai_tables
   ```

3. Seed pricing data:
   ```bash
   npx tsx scripts/analyze-pricing-data.ts
   ```

4. Start with Phase 1, Task 1.1 (Claude API Integration)

---

## Reference: Historical Data Schema

The 1,500+ cleanings data includes:

```typescript
interface HistoricalCleaning {
  id: string;
  completedAt: Date;
  serviceType: "STANDARD" | "DEEP_CLEAN" | "MOVE_OUT";
  price: number;
  duration: number; // minutes

  // Property details
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: "HOUSE" | "APARTMENT" | "CONDO" | "TOWNHOUSE";

  // Location
  zipCode: string;
  city: string;
  state: string;

  // Client info
  isNewCustomer: boolean;
  isRecurring: boolean;
  clientLifetimeValue: number;

  // Add-ons
  addOns: {
    name: string;
    price: number;
  }[];

  // Outcome
  rating?: number; // 1-5
  tipAmount?: number;
  rebooked: boolean;
}
```

Use this data to:
- Train the pricing model
- Calculate average metrics
- Identify patterns for recommendations
- Generate realistic test scenarios
