import { EventEmitter } from 'events';
import { ChatMessage } from '../../types';

export interface ChatEvents {
  message: [{
    channelId: string;
    content: string;
    authorId: string;
    mentions: string[];
  }];
}

export interface ChatInterface extends EventEmitter {
  sendMessage(channelId: string, content: string): Promise<void>;
  replyMessage(message: ChatMessage, content: string): Promise<void>;
  start(): void;
  getBotId(): string;
  getBotName(): string;
  sendTyping(channelId: string): Promise<void>;
}
