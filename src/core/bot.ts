import { ChatInterface } from './chat/chat-interface';
import { LLMInterface } from './llm/llm-interface';
import { ChatCompletionMessage, ChatMessage, ToolFunction, ChatCompletionContentPart } from '../types';
import { config } from '../config';
import { replacePlaceholders } from '../utils/replacePlaceholders';
import { getMemory } from '../utils/memory';
import { ChatMessageHistory } from '../types';
import { ContextManager } from './context-manager';

export class Bot {
  private chatService: ChatInterface;
  private llm: LLMInterface;
  private tools: ToolFunction[];
  private contextManager: ContextManager;

  constructor(
    chatService: ChatInterface,
    llm: LLMInterface,
    tools: ToolFunction[]
  ) {
    this.chatService = chatService;
    this.llm = llm;
    this.tools = tools;
    this.contextManager = new ContextManager();

    this.chatService.on('message', this.onMessage.bind(this));
  }

  start() {
    this.chatService.start();
  }

  private chatCompletionMessageFromMessage(message: ChatMessage): ChatCompletionMessage {
    if (!message.images || message.images.length === 0 || this.isMessageOlderThan3Hours(message.createdAt)) {
      return {
        role: 'user',
        content: message.content,
        name: message.authorId,
      };
    }

    let contents: ChatCompletionContentPart[] = []
    contents.push({ text: message.content, type: 'text' });
    contents.push(
      ...message.images.map((image) => ({
          type: 'image_url' as const,
          image_url: {
            url: image,
          }
        }))
    );

    return {
      role: 'user',
      content: contents,
      name: message.authorId,
    }
  }

  private isMessageOlderThan3Hours(createdAt: Date): boolean {
    const threeHoursInMs = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const now = new Date();
    return now.getTime() - createdAt.getTime() > threeHoursInMs;
  }

  private async onMessage(message: ChatMessage, isSecondAttempt: boolean = false) {
    const messageTokenCount = this.llm.getTokenCount(message.content) + ((message.images?.length || 0) * 85); // Currently hardcoded for low OpenAI Vision image. Need to change this.
    const context = this.contextManager.getContext(message.channelId);
    const messages = context.messages;

    // Add new message to context
    const newMessageHistory = new ChatMessageHistory(
      message,
      this.chatCompletionMessageFromMessage(message),
      messageTokenCount
    );

    this.contextManager.addMessage(message.channelId, newMessageHistory);

    // Check if bot is mentioned
    if (message.mentions.includes(this.chatService.getBotId())) {
      const sendTyping = () => {
        this.chatService.sendTyping(message.channelId);
      };

      const typingInterval = setInterval(sendTyping, 5000);
      sendTyping();

      try {
        const response = await this.generateResponse(message.channelId);
        clearInterval(typingInterval);
        await this.chatService.replyMessage(message, response.message);
        if (response.source) {
          await this.chatService.sendMessage(message.channelId, response.source);
        }

        console.log(
          "Message total count",
          messages.length,
          "Message token count",
          context.tokenCount
        );
      } catch (error) {
        clearInterval(typingInterval);

        this.contextManager.clearContext(message.channelId);
        if (isSecondAttempt) {
          await this.chatService.replyMessage(message, 'Terjadi kesalahan, silakan coba lagi.');
        }
        else {
          this.onMessage(message, true);
        }
      }
    }
  }

  private isDirectMessage(message: ChatMessage): boolean {
    // Implement logic to determine if the message is a direct message to the bot
    return false; // Placeholder
  }

  private async generateResponse(
    channelId: string,
    functionCallInfos: string[] = []
  ): Promise<{ message: string; source?: string }> {
    const context = this.contextManager.getContext(channelId);
    const messages = context.messages;
    const chatMessageCompletions = messages.map((msg) => msg.completion);

    // Prepare system messages
    const systemMessages = await this.prepareSystemMessages(messages, channelId);

    const functions = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const responseMessage = await this.llm.generateResponse(
      [...systemMessages, ...chatMessageCompletions],
      functions
    );

    // Handle function calls
    if (responseMessage.function_call) {
      const functionResponse = await this.handleFunctionCall(
        responseMessage.function_call,
        channelId
      );

      const responseContent = JSON.stringify(functionResponse.response);
      const responseTokenCount = this.llm.getTokenCount(responseContent);

      const functionMessage = new ChatMessageHistory(
        {
          channelId,
          content: functionResponse.info,
          authorId: this.chatService.getBotId(),
          authorName: this.chatService.getBotName(),
          mentions: [],
          createdAt: new Date(),
        },
        {
          role: 'function',
          name: responseMessage.function_call.name,
          content: responseContent,
        },
        responseTokenCount
      );

      this.contextManager.addMessage(channelId, functionMessage, true);

      return this.generateResponse(channelId, [...functionCallInfos, functionResponse.info]);
    }

    const source = this.formatFunctionCallInfos(functionCallInfos);

    // Remove function calls from messages for context
    const cleanedMessages = messages.filter((msg) => msg.completion.role != 'function');

    // Add assistant's response to context
    const assistantMessage = new ChatMessageHistory(
      {
        channelId,
        content: responseMessage.content as string || '',
        authorId: this.chatService.getBotId(),
        authorName: this.chatService.getBotName(),
        mentions: [],
        createdAt: new Date(),
      },
      {
        role: 'assistant',
        content: responseMessage.content || '',
      },
      this.llm.getTokenCount(responseMessage.content || '')
    );

    cleanedMessages.push(assistantMessage);

    // If there's a source, add it to context
    if (source) {
      const sourceSystemMessageContent = `The answer you created above is generated from these sources:\n${source}`;
      const sourceSystemMessage = new ChatMessageHistory(
        {
          channelId,
          content: sourceSystemMessageContent,
          authorId: this.chatService.getBotId(),
          authorName: this.chatService.getBotName(),
          mentions: [],
          createdAt: new Date(),
        },
        {
          role: 'system',
          content: sourceSystemMessageContent,
        },
        this.llm.getTokenCount(sourceSystemMessageContent)
      );

      cleanedMessages.push(sourceSystemMessage);
    }

    // Update context
    const totalTokenCount = cleanedMessages.reduce((sum, msg) => sum + msg.tokens, 0);
    this.contextManager.setContext(channelId, cleanedMessages, totalTokenCount);

    return {
      message: responseMessage.content as string || 'Sorry, I could not generate a response.',
      source,
    };
  }

  private async handleFunctionCall(
    functionCall: any,
    channelId: string
  ): Promise<{ response: any; info: string }> {
    const tool = this.tools.find((t) => t.name === functionCall.name);
    if (!tool) {
      throw new Error(`Tool not found: ${functionCall.name}`);
    }
    const args = { ...JSON.parse(functionCall.arguments || '{}'), channelId };
    const response = await tool.function(args);
    const info = tool.functionInfo(args);

    return { response, info };
  }

  private async prepareSystemMessages(
    messages: ChatMessageHistory[],
    channelId: string
  ): Promise<ChatCompletionMessage[]> {
    const systemPrompt = replacePlaceholders(config.systemPrompt, this.chatService);
    const systemMessage: ChatCompletionMessage = { role: 'system', content: systemPrompt };

    const channelUsers = new Map(messages.map((msg) => [msg.authorId, msg.authorName]));
    const channelUsersSystemPrompt = Array.from(channelUsers.entries())
      .map(([id, name]) => `User ID: ${id} | ${name}`)
      .join('\n');

    const channelUsersSystemMessage: ChatCompletionMessage = {
      role: 'system',
      content: `Users in this channel (Format: User's ID | User's Name):\n${channelUsersSystemPrompt}\n\nAll messages from each users will include their ID. Use this information to personalize responses or to keep track of the conversation context. When you receive message, make sure to keep which user sent the message in mind and use it to personalize responses or to keep track of the conversation context.`,
    };

    const memory = await getMemory(channelId);
    const memorySystemMessage: ChatCompletionMessage = {
      role: 'system',
      content: `Memory (Notes that you have taken before):\n${memory}\n\nAlways proactively call \`addMemory\` function for any information the user shares that could be relevant for enhancing future interactions, even if the user doesn't explicitly request it. This includes all information about the user's preferences, goals, location, interests, relationships, and unique habits or contexts. DO NOT FORGET TO USE ADDMEMORY WHEN YOU THINK IT'S NECESSARY.`,
    };

    return [
      systemMessage,
      channelUsersSystemMessage,
      memorySystemMessage,
    ];
  }

  private formatFunctionCallInfos(functionCallInfos: string[]): string | undefined {
    if (functionCallInfos.length === 0) return undefined;
    return (
      "### 🔍 Sumber\n" + functionCallInfos.map((info) => `- ${info}`).join('\n')
    );
  }
}
