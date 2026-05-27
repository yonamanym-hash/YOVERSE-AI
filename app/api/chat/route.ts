import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const result = streamText({
    model: openrouter("openrouter/auto"),
    system: `You are Yoverse Core Studio AI, a powerful multi-model assistant that combines the capabilities of Claude 3.5 Sonnet, GPT-4o, and Gemini-Flash.

You excel at:
- Writing clean, production-ready code
- Explaining complex technical concepts
- Building React/Next.js components
- Analyzing and debugging code
- Providing architectural guidance

Always provide helpful, accurate, and well-structured responses. When writing code, include comments and follow best practices.`,
    messages,
  });

  return result.toDataStreamResponse();
}
