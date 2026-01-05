import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIRouter, ChatMessage, TaskType, MODEL_ROUTING } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

// POST /api/ai/chat - Send a message to the AI and get a streaming response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: { select: { name: true } },
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { message, conversationId, history = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get or create conversation
    let conversation = conversationId
      ? await prisma.aIConversation.findFirst({
          where: {
            id: conversationId,
            companyId: user.companyId,
            userId: user.id,
          },
        })
      : null;

    // Fetch business context for the AI
    const businessContext = await getBusinessContext(user.companyId);

    // Build the system prompt with business context
    const systemPrompt = buildSystemPrompt(
      user.company.name,
      user.name || "User",
      businessContext
    );

    // Build message history (last 10 messages)
    const messages: ChatMessage[] = [
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // First, classify the intent to determine which model to use
    const router = getAIRouter();
    let taskType: TaskType = "chat_response";

    try {
      const intentResult = await router.complete(
        "intent_classification",
        message,
        { systemPrompt: SYSTEM_PROMPTS.intent_classification }
      );

      const intentData = JSON.parse(intentResult.content);

      // Route to appropriate task type based on intent
      if (
        intentData.intent === "campaign_request" ||
        intentData.intent === "marketing"
      ) {
        taskType = "campaign_generation";
      } else if (
        intentData.intent === "pricing_help" ||
        intentData.intent === "pricing"
      ) {
        taskType = "pricing_suggestion";
      } else if (
        ["revenue_summary", "top_customers", "cleaner_performance"].includes(
          intentData.intent
        )
      ) {
        taskType = "business_insights";
      }

      // Log usage for intent classification
      await logAIUsage(
        user.companyId,
        "intent_classification",
        intentResult
      );
    } catch {
      // If intent classification fails, continue with chat_response
      console.log("Intent classification failed, using default chat_response");
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in the background
    (async () => {
      try {
        let fullResponse = "";
        const streamGenerator = router.stream(taskType, messages, {
          systemPrompt,
        });

        for await (const chunk of streamGenerator) {
          fullResponse += chunk;
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          );
        }

        // Save conversation and log usage
        const newMessages = [
          ...history,
          { role: "user", content: message, timestamp: new Date() },
          { role: "assistant", content: fullResponse, timestamp: new Date() },
        ];

        if (conversation) {
          await prisma.aIConversation.update({
            where: { id: conversation.id },
            data: { messages: newMessages, updatedAt: new Date() },
          });
        } else {
          conversation = await prisma.aIConversation.create({
            data: {
              companyId: user.companyId,
              userId: user.id,
              title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
              messages: newMessages,
            },
          });
        }

        // Send final message with conversation ID
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              conversationId: conversation.id,
            })}\n\n`
          )
        );

        // Log usage
        const config = MODEL_ROUTING[taskType];
        await prisma.aIUsage.create({
          data: {
            companyId: user.companyId,
            feature: "chat",
            provider: config.provider,
            model: config.model,
            inputTokens: estimateTokens(systemPrompt + message),
            outputTokens: estimateTokens(fullResponse),
            cost: estimateCost(
              taskType,
              systemPrompt + message,
              fullResponse
            ),
          },
        });
      } catch (error) {
        console.error("Streaming error:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "An error occurred while generating the response",
            })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// GET /api/ai/chat - Get conversation history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      // Get specific conversation
      const conversation = await prisma.aIConversation.findFirst({
        where: {
          id: conversationId,
          companyId: user.companyId,
        },
      });

      return new Response(JSON.stringify({ success: true, conversation }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get recent conversations
    const conversations = await prisma.aIConversation.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Response(JSON.stringify({ success: true, conversations }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/ai/chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch conversations" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper functions

async function getBusinessContext(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalClients,
    activeCleaners,
    thisMonthBookings,
    thisMonthRevenue,
    lastMonthRevenue,
    upcomingToday,
  ] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.teamMember.count({ where: { companyId, isActive: true } }),
    prisma.booking.count({
      where: {
        companyId,
        scheduledDate: { gte: startOfMonth },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
    }),
    prisma.booking.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        isPaid: true,
        scheduledDate: { gte: startOfMonth },
      },
      _sum: { price: true },
    }),
    prisma.booking.aggregate({
      where: {
        companyId,
        status: "COMPLETED",
        isPaid: true,
        scheduledDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { price: true },
    }),
    prisma.booking.count({
      where: {
        companyId,
        status: "SCHEDULED",
        scheduledDate: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  return {
    totalClients,
    activeCleaners,
    thisMonthBookings,
    thisMonthRevenue: thisMonthRevenue._sum.price || 0,
    lastMonthRevenue: lastMonthRevenue._sum.price || 0,
    upcomingToday,
  };
}

function buildSystemPrompt(
  companyName: string,
  userName: string,
  context: Awaited<ReturnType<typeof getBusinessContext>>
) {
  return `${SYSTEM_PROMPTS.chat}

Current business context for ${companyName}:
- User: ${userName}
- Total clients: ${context.totalClients}
- Active cleaners: ${context.activeCleaners}
- Bookings this month: ${context.thisMonthBookings}
- Revenue this month: $${context.thisMonthRevenue.toFixed(2)}
- Revenue last month: $${context.lastMonthRevenue.toFixed(2)}
- Jobs scheduled today: ${context.upcomingToday}

Today's date: ${new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAIUsage(companyId: string, feature: string, result: any) {
  const config =
    MODEL_ROUTING[feature as TaskType] || MODEL_ROUTING.chat_response;
  await prisma.aIUsage.create({
    data: {
      companyId,
      feature,
      provider: result.provider || config.provider,
      model: result.model || config.model,
      inputTokens: result.usage?.inputTokens || 0,
      outputTokens: result.usage?.outputTokens || 0,
      cost: calculateCost(config, result.usage),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateCost(config: any, usage: any): number {
  if (!usage) return 0;
  const inputCost =
    ((usage.inputTokens || 0) / 1_000_000) * config.costPer1MInput;
  const outputCost =
    ((usage.outputTokens || 0) / 1_000_000) * config.costPer1MOutput;
  return inputCost + outputCost;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function estimateCost(
  taskType: TaskType,
  input: string,
  output: string
): number {
  const config = MODEL_ROUTING[taskType];
  const inputTokens = estimateTokens(input);
  const outputTokens = estimateTokens(output);
  const inputCost = (inputTokens / 1_000_000) * config.costPer1MInput;
  const outputCost = (outputTokens / 1_000_000) * config.costPer1MOutput;
  return inputCost + outputCost;
}
