import { Client, Events, Message, Channel } from 'discord.js';
import { ChatInterface } from './chat-interface';
import { EventEmitter } from 'events';
import { config } from '../../config';
import { ChatMessage } from '../../types';

class DiscordChatMessage implements ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  images?: string[];
  message: Message;

  constructor(message: Message) {
    this.channelId = message.channelId;
    this.content = message.content;
    this.authorId = message.author.id;
    this.authorName = `Display Name: ${message.author.displayName} | Global Display Name: ${message.author.globalName} | Username: ${message.author.username}`;
    this.mentions = message.mentions.users.map(user => user.id);
    // Extract image URLs from attachments
    this.images = message.attachments
      .filter(att => att.contentType?.startsWith('image/'))
      .map(att => att.url);
    this.message = message;
  }
}

message: Message;

export class DiscordChat extends EventEmitter implements ChatInterface {
  private client: Client;
  private channelCache: Map<string, {channel: Channel, lastFetchedTime: Date}> = new Map();

  constructor() {
    super();
    this.client = new Client({
      intents: ['GuildMessages', 'Guilds', 'MessageContent'],
    });
  }

  start(): void {
    this.client.login(config.discordToken);
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
    });

    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
  }

  getBotId(): string {
    return this.client.user?.id || '';
  }

  getBotName(): string {
    return this.client.user?.username || config.botName;
  }

  private onMessageCreate(message: Message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Emit message event
    this.emit('message', new DiscordChatMessage(message));
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    const channel = await this.fetchChannel(channelId);
    if (channel?.isSendable()) {
      const messages = this.splitMessage(this.removeUrlPreviews(content));
      if (messages.length > 0) {
        await channel.send(messages[0]);
        for (let i = 1; i < messages.length; i++) {
          await channel.send(messages[i]);
        }
      }
    }
  }

  async sendTyping(channelId: string): Promise<void> {
    const channel = await this.fetchChannel(channelId);
    if (channel?.isSendable()) {
      await channel.sendTyping();
    }
  }

  async replyMessage(message: ChatMessage, content: string): Promise<void> {
    if (message instanceof DiscordChatMessage) {
      const messages = this.splitMessage(this.removeUrlPreviews(content));
      if (messages.length > 0) {
        await message.message.reply(messages[0]);
        for (let i = 1; i < messages.length; i++) {
          await this.sendMessage(message.channelId, messages[i]);
        }
      }
    } else {
      await this.sendMessage(message.channelId, content);
    }
  }

  private splitMessage(content: string): string[] {
    const maxLength = 1000;
    const messages: string[] = [];
    let remaining = content;

    while (remaining.length > maxLength) {
      // First try to split at a line break
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      
      // If no line break is found, fall back to space
      if (splitIndex === -1 || maxLength - splitIndex > 100) {
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      
      // If still no good split point, force split at maxLength
      if (splitIndex === -1 || maxLength - splitIndex > 100) {
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

  private async fetchChannel(channelId: string): Promise<Channel | null> {
    const cachedChannel = this.channelCache.get(channelId);
    if (cachedChannel && new Date().getTime() - cachedChannel.lastFetchedTime.getTime() < 60000) {
      return cachedChannel.channel;
    }

    const channel = await this.client.channels.fetch(channelId);

    if (channel) {
      this.channelCache.set(channelId, { channel, lastFetchedTime: new Date() });
    }

    return channel;
  }

  private removeUrlPreviews(content: string): string {
    // Handle markdown links [text](url)
    content = content.replace(/\[([^\]]+)\]\((https?:\/\/\S+)\)/g, '[$1](<$2>)');
    // Handle regular URLs
    content = content.replace(/(?<!<|\[.*\]\()(https?:\/\/\S+)(?!>|\))/g, '<$1>');
    return content;
  }
}
