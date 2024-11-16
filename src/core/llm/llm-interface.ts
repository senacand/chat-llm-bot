import { ChatCompletionMessage } from '../../types';

export interface LLMInterface {
  generateResponse(
    messages: ChatCompletionMessage[],
    functions?: any[]
  ): Promise<ChatCompletionMessage>;
  
  getTokenCount(content: string | any[]): number;
}
