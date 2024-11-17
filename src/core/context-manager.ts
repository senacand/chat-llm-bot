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

  addMessage(channelId: string, message: ChatMessageHistory, isFunctionCall: boolean = false) {
    const context = this.getContext(channelId);
    context.messages.push(message);
    context.tokenCount += message.tokens;

    // Give more tokens for function calls
    const maxTokenPerChannel = isFunctionCall ? 100000 : this.maxTokenPerChannel;

    // Keep context within token limit
    while (context.tokenCount > maxTokenPerChannel && context.messages.length > 0) {
      let removedMessage = context.messages.shift();

      if (
        isFunctionCall 
        && removedMessage?.completion.role === 'user' 
        && context.messages.length > 0 
        && !context.messages.some(m => m.completion.role === 'user')
      ) {
        // If the removed message is a user message and there are no more user messages in the context
        // remove the next message instead
        
        const temp = removedMessage;
        removedMessage = context.messages.shift();
        context.messages.unshift(temp);
      }

      context.tokenCount -= removedMessage?.tokens || 0;
    }

    this.contextMessages.set(channelId, context);
  }

  setContext(channelId: string, messages: ChatMessageHistory[], tokenCount: number) {
    this.contextMessages.set(channelId, { messages, tokenCount });
  }

  clearContext(channelId: string) {
    this.contextMessages.delete(channelId);
  }
}
