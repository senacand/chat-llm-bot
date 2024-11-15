import { Client } from 'tmi.js';
import { ChatInterface } from './chat-interface';
import { EventEmitter } from 'events';
import { config } from '../../config';
import { ChatMessage } from '../../types';

class TwitchChatMessage implements ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  
  constructor(channel: string, userstate: any, message: string) {
    this.channelId = channel;
    this.content = message;
    this.authorId = userstate['user-id'] || '';
    this.authorName = userstate['display-name'] || userstate.username || '';
    // Extract mentions from message (Twitch style @username)
    this.mentions = message.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];
  }
}

export class TwitchChat extends EventEmitter implements ChatInterface {
  private client: Client;
  private botUsername: string;
  private channels: string[];
  
  constructor() {
    super();
    this.botUsername = config.twitchBotUsername;
    this.channels = config.twitchChannels;
    
    if (!this.channels.length) {
      throw new Error('No Twitch channels configured');
    }

    this.client = new Client({
      options: { debug: true },
      identity: {
        username: this.botUsername,
        password: `oauth:${config.twitchToken}`
      },
      channels: this.channels
    });

    console.log(`Initializing Twitch chat for channels: ${this.channels.join(', ')}`);
  }

  start(): void {
    this.client.connect()
      .then(() => {
        console.log(`Connected to Twitch as ${this.botUsername}`);
        console.log(`Joined channels: ${this.channels.join(', ')}`);
      })
      .catch(console.error);

    this.client.on('message', (channel, userstate, message, self) => {
      if (self) return;
      this.emit('message', new TwitchChatMessage(channel, userstate, message));
    });

    this.client.on('join', (channel, username) => {
      if (username.toLowerCase() === this.botUsername.toLowerCase()) {
        console.log(`Joined channel: ${channel}`);
      }
    });
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.channels.includes(channelId)) {
      console.warn(`Attempting to send message to non-joined channel: ${channelId}`);
      return;
    }

    const messages = this.splitMessage(content);
    for (const msg of messages) {
      await this.client.say(channelId, msg);
    }
  }
  
  async sendTyping(): Promise<void> {
    // Twitch doesn't have a typing indicator
    return;
  }
  
  async replyMessage(message: ChatMessage, content: string): Promise<void> {
    const messages = this.splitMessage(content);
    const lowerContent = content.toLowerCase();
    const lowerAuthorName = message.authorName.toLowerCase();
    const hasAuthorMention = lowerContent.includes(`@${lowerAuthorName}`);

    for (let i = 0; i < messages.length; i++) {
      if (i === 0 && !hasAuthorMention) {
      await this.client.say(message.channelId, `@${message.authorName} ${messages[i]}`);
      } else {
      await this.sendMessage(message.channelId, messages[i]);
      }
    }
  }
  
  getBotId(): string {
    return this.botUsername;
  }
  
  getBotName(): string {
    return this.botUsername;
  }
  
  private splitMessage(content: string): string[] {
    const maxLength = 500; // Twitch message length limit
    const messages: string[] = [];
    let remaining = content;
    
    while (remaining.length > maxLength) {
      let splitIndex = remaining.lastIndexOf(' ', maxLength);
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }
      
      messages.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex).trim();
    }
    
    if (remaining.length > 0) {
      messages.push(remaining);
    }
    
    return messages;
  }
}