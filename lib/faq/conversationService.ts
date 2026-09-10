import { prisma } from "@/lib/db/prisma";
import { answerQuestion } from "./faqService";
import { isLikelyName, sanitizeName, buildGreeting } from "./nameDetection";
import type { ChatMessage } from "@/types/chat";

export async function getOrCreateConversation(sessionId: string) {
  const existing = await prisma.conversation.findUnique({ where: { sessionId } });
  if (existing) return existing;
  return prisma.conversation.create({ data: { sessionId } });
}

async function logMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT",
  content: string,
  matchedTopicId?: string,
  confidence?: number
) {
  await prisma.message.create({
    data: { conversationId, role, content, matchedTopicId, confidence },
  });
}

/**
 * Core conversation state machine:
 *  1. If we don't have the user's name yet, treat this message as their name
 *     and greet them personally.
 *  2. Otherwise, route the message through the FAQ matching engine.
 *
 * Returns the list of assistant messages to render (usually one).
 */
export async function handleIncomingMessage(sessionId: string, userText: string): Promise<{
  userName: string | null;
  assistantMessages: ChatMessage[];
}> {
  const conversation = await getOrCreateConversation(sessionId);
  await logMessage(conversation.id, "USER", userText);

  const now = () => new Date().toISOString();
  const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!conversation.userName) {
    const name = isLikelyName(userText) ? sanitizeName(userText) : sanitizeName(userText.slice(0, 60));
    const finalName = name || "there";

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { userName: finalName },
    });

    const greeting = buildGreeting(finalName);
    await logMessage(conversation.id, "ASSISTANT", greeting);

    return {
      userName: finalName,
      assistantMessages: [
        { id: nextId(), role: "assistant", kind: "text", content: greeting, createdAt: now() },
      ],
    };
  }

  const answer = await answerQuestion(userText);

  if (answer.kind === "topic-result" && answer.topic) {
    const content = `Your question appears to be related to ${answer.topic.purpose}.`;
    await logMessage(conversation.id, "ASSISTANT", content, answer.topic.id);
    return {
      userName: conversation.userName,
      assistantMessages: [
        {
          id: nextId(),
          role: "assistant",
          kind: "topic-result",
          content,
          createdAt: now(),
          topic: answer.topic,
        },
      ],
    };
  }

  if (answer.kind === "topic-choices" && answer.choices) {
    const content = "I found a couple of HR topics that may match your question. Please choose one:";
    await logMessage(conversation.id, "ASSISTANT", content);
    return {
      userName: conversation.userName,
      assistantMessages: [
        {
          id: nextId(),
          role: "assistant",
          kind: "topic-choices",
          content,
          createdAt: now(),
          choices: answer.choices,
        },
      ],
    };
  }

  const content =
    "Sorry, I couldn't find a specific HR topic matching your question. Could you please rephrase your question or provide a little more detail?";
  await logMessage(conversation.id, "ASSISTANT", content);
  return {
    userName: conversation.userName,
    assistantMessages: [
      {
        id: nextId(),
        role: "assistant",
        kind: "no-match",
        content,
        createdAt: now(),
        suggestions: answer.suggestions ?? [],
      },
    ],
  };
}

/** Used when the user clicks one of the "topic-choices" buttons directly. */
export async function handleTopicSelection(sessionId: string, topicId: string) {
  const conversation = await getOrCreateConversation(sessionId);
  const { getTopicResult } = await import("./faqService");
  const topic = await getTopicResult(topicId);

  const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = () => new Date().toISOString();

  if (!topic) {
    const content = "Sorry, that topic is no longer available. Please ask your question again.";
    await logMessage(conversation.id, "ASSISTANT", content);
    return { assistantMessages: [{ id: nextId(), role: "assistant" as const, kind: "no-match" as const, content, createdAt: now(), suggestions: [] }] };
  }

  const content = `Your question appears to be related to ${topic.purpose}.`;
  await logMessage(conversation.id, "ASSISTANT", content, topic.id);

  return {
    assistantMessages: [
      {
        id: nextId(),
        role: "assistant" as const,
        kind: "topic-result" as const,
        content,
        createdAt: now(),
        topic,
      },
    ],
  };
}
