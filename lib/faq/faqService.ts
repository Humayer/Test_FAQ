import { prisma } from "@/lib/db/prisma";
import { matchQuestionToTopics, type MatchableTopic } from "@/lib/search/matchTopic";
import type { ContactCardPerson, TopicResult, TopicChoice } from "@/types/chat";

export async function getActiveMatchableTopics(): Promise<MatchableTopic[]> {
  const topics = await prisma.fAQTopic.findMany({
    where: { isActive: true },
    select: { id: true, purpose: true, keywords: true, department: true },
  });
  return topics;
}

export async function getTopicResult(topicId: string): Promise<TopicResult | null> {
  const topic = await prisma.fAQTopic.findUnique({
    where: { id: topicId },
    include: {
      contacts: {
        include: { contactPerson: true },
      },
    },
  });

  if (!topic) return null;

  const contacts: ContactCardPerson[] = topic.contacts.map((tc) => ({
    name: tc.contactPerson.name,
    email: tc.contactPerson.email,
    needsReview: tc.contactPerson.needsReview,
  }));

  return {
    id: topic.id,
    purpose: topic.purpose,
    department: topic.department,
    contacts,
  };
}

export interface FaqAnswer {
  kind: "topic-result" | "topic-choices" | "no-match";
  topic?: TopicResult;
  choices?: TopicChoice[];
  suggestions?: string[];
}

/** Small, curated fallback list shown when we truly can't find any match. */
async function suggestedCategories(limit = 8): Promise<string[]> {
  const topics = await prisma.fAQTopic.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { purpose: true },
    take: limit,
  });
  return topics.map((t) => t.purpose);
}

/**
 * Given a free-text employee question, decides how to answer:
 *  - high confidence -> a single topic result with contacts
 *  - medium confidence -> a list of candidate topics to choose from
 *  - low / no confidence -> "couldn't find a match" + suggested categories
 *
 * This function never invents HR information: it can only return topics and
 * contacts that already exist in the database.
 */
export async function answerQuestion(question: string): Promise<FaqAnswer> {
  const topics = await getActiveMatchableTopics();
  const { best, candidates, confidence } = matchQuestionToTopics(question, topics);

  if (!best || confidence === "low") {
    return { kind: "no-match", suggestions: await suggestedCategories() };
  }

  if (confidence === "high" || candidates.length <= 1) {
    const topicResult = await getTopicResult(best.topic.id);
    if (!topicResult) {
      return { kind: "no-match", suggestions: await suggestedCategories() };
    }
    return { kind: "topic-result", topic: topicResult };
  }

  // Medium confidence with more than one plausible topic -> let the user pick.
  return {
    kind: "topic-choices",
    choices: candidates.map((c) => ({ id: c.topic.id, purpose: c.topic.purpose, score: c.score })),
  };
}
