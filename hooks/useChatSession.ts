"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

const SESSION_STORAGE_KEY = "dp-hr-faq-session-id";
const MESSAGES_STORAGE_KEY = "dp-hr-faq-messages";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

function initialAssistantMessage(): ChatMessage {
  return {
    id: "welcome-name-prompt",
    role: "assistant",
    kind: "text",
    content: "May I know your name please?",
    createdAt: new Date().toISOString(),
  };
}

export function useChatSession() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const id = getOrCreateSessionId();
    setSessionId(id);

    const savedMessages = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // One-time restore of a previous session's messages from localStorage on mount.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMessages(parsed);
          return;
        }
      } catch {
        // fall through to fresh conversation
      }
    }
    setMessages([initialAssistantMessage()]);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const appendMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId) return;

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        kind: "text",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      appendMessages([userMessage]);
      setIsTyping(true);
      setError(null);

      try {
        const res = await fetch("/api/faq/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: trimmed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong. Please try again.");
        }

        const data = (await res.json()) as { assistantMessages: ChatMessage[] };
        appendMessages(data.assistantMessages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, appendMessages]
  );

  const selectTopic = useCallback(
    async (topicId: string, topicLabel: string) => {
      if (!sessionId) return;

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user-choice`,
        role: "user",
        kind: "text",
        content: topicLabel,
        createdAt: new Date().toISOString(),
      };
      appendMessages([userMessage]);
      setIsTyping(true);
      setError(null);

      try {
        const res = await fetch("/api/faq/select-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, topicId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong. Please try again.");
        }

        const data = (await res.json()) as { assistantMessages: ChatMessage[] };
        appendMessages(data.assistantMessages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, appendMessages]
  );

  const restart = useCallback(() => {
    const newId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, newId);
    window.localStorage.removeItem(MESSAGES_STORAGE_KEY);
    setSessionId(newId);
    setMessages([initialAssistantMessage()]);
    setError(null);
  }, []);

  return { sessionId, messages, isTyping, error, sendMessage, selectTopic, restart };
}
