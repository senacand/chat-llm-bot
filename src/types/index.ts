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

export interface ToolFunction {
  name: string;
  description: string;
  parameters: any;
  function: (args: any) => Promise<any>;
  functionInfo: (args: any) => string;
}
