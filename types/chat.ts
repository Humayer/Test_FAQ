export interface ContactCardPerson {
  name: string;
  email: string | null;
  needsReview: boolean;
}

export interface TopicResult {
  id: string;
  purpose: string;
  department: string;
  contacts: ContactCardPerson[];
}

export type ChatMessageKind =
  | "text"
  | "ask-name"
  | "topic-result"
  | "topic-choices"
  | "no-match"
  | "typing";

export interface TopicChoice {
  id: string;
  purpose: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  kind: ChatMessageKind;
  content: string;
  createdAt: string;
  topic?: TopicResult;
  choices?: TopicChoice[];
  suggestions?: string[];
}
