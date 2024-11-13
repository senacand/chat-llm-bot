import { ChatMessageHistory } from '../types';
import { config } from '../config';

export class ContextManager {
  private contextMessages = new Map<
    string,
    { messages: ChatMessageHistory[]; tokenCount: number }
  >();

  constructor(private maxTokenPerChannel: number = config.maxTokenPerChannel) {}

  getContext(channelId: string) {
    return this.contextMessages.get(channelId) || { messages: [], tokenCount: 0 };
  }

  addMessage(channelId: string, message: ChatMessageHistory) {
    const context = this.getContext(channelId);
    context.messages.push(message);
    context.tokenCount += message.tokens;

    // Keep context within token limit
    while (context.tokenCount > this.maxTokenPerChannel && context.messages.length > 0) {
      const removedMessage = context.messages.shift();
      context.tokenCount -= removedMessage?.tokens || 0;
    }

    this.contextMessages.set(channelId, context);
  }

  setContext(channelId: string, messages: ChatMessageHistory[], tokenCount: number) {
    this.contextMessages.set(channelId, { messages, tokenCount });
  }
}
