export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
}

export class ChatMessageHistory implements ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  completion: ChatCompletionMessage;
  tokens: number;

  constructor(
    message: ChatMessage,
    completion: ChatCompletionMessage,
    tokens: number
  ) {
    this.channelId = message.channelId;
    this.content = message.content;
    this.authorId = message.authorId;
    this.authorName = message.authorName;
    this.mentions = message.mentions;
    this.completion = completion;
    this.tokens = tokens;
  }
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: any;
  function: (args: any) => Promise<any>;
  functionInfo: (args: any) => string;
}
