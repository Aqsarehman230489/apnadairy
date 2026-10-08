// Chat endpoint for the ApnaDairy Assistant tab.
//
// Backend:
//   POST /api/v1/farmer/assistant  -> { reply, suggestions }
//
import { post } from './http';

/** Backend reply payload for an assistant chat turn. */
interface AssistantOut {
  reply: string;
  suggestions: string[] | null;
}

/** One assistant turn: the reply text plus optional follow-up questions. */
export interface AssistantAnswer {
  reply: string;
  suggestions: string[];
}

/** Ask the assistant a question. Throws a clear Error on failure. */
export async function askAssistant(message: string): Promise<AssistantAnswer> {
  if (!message.trim()) throw new Error('Please type a question first.');
  const data = await post<AssistantOut>('/api/v1/farmer/assistant', {
    message,
  });
  return {
    reply: data.reply ?? '',
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}
