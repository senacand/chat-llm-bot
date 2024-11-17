import OpenAI from 'openai';
import { LLMInterface } from './llm-interface';
import { ChatCompletionMessage } from '../../types';
import { config } from '../../config';
import { encoding_for_model, TiktokenModel } from 'tiktoken';

export class OpenAILLM implements LLMInterface {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openAiApiKey });
  }

  async generateResponse(
    messages: ChatCompletionMessage[],
    functions: any[] = []
  ): Promise<ChatCompletionMessage> {
    const response = await this.openai.chat.completions.create({
      model: config.model,
      messages: messages.map(msg => {
        const message: any = {
          role: msg.role,
          content: msg.content
        };
        if (msg.function_call) message.function_call = msg.function_call;
        if (msg.name) message.name = msg.name;
        return message;
      }),
      functions: functions,
    });
    return response.choices[0].message as ChatCompletionMessage;
  }

  getTokenCount(content: string): number {
    const model = config.model as TiktokenModel || 'gpt-4o-mini';
    let enc = encoding_for_model(model);

    let encode = enc.encode(content);
    let count = encode.length;
    enc.free();

    return count;
  }
}
