export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | Array<ChatCompletionContentPart>;
  name?: string;
  function_call?: any;
}

export interface ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  images?: string[];
  createdAt: Date;
}

export class ChatMessageHistory implements ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  images?: string[];
  completion: ChatCompletionMessage;
  tokens: number;
  createdAt: Date;

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
    this.createdAt = new Date();
  }
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: any;
  function: (args: any) => Promise<any>;
  functionInfo: (args: any) => string;
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage;

export interface ChatCompletionContentPartText {
  text: string;
  type: 'text';
}

export interface ChatCompletionContentPartImage {
  image_url: ChatCompletionContentPartImage.ImageURL;
  type: 'image_url';
}

export namespace ChatCompletionContentPartImage {
  export interface ImageURL {
    /**
     * Either a URL of the image or the base64 encoded image data.
     */
    url: string;

    /**
     * Specifies the detail level of the image. Learn more in the
     * [Vision guide](https://platform.openai.com/docs/guides/vision#low-or-high-fidelity-image-understanding).
     */
    detail?: 'auto' | 'low' | 'high';
  }
}