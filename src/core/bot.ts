import { ChatInterface } from './chat/chat-interface';
import { LLMInterface } from './llm/llm-interface';
import { ChatCompletionMessage, ChatMessage, ToolFunction } from '../types';
import { config } from '../config';
import { replacePlaceholders } from '../utils/replacePlaceholders';
import { getMemory } from '../utils/memory';

class ChatMessageHistory implements ChatMessage {
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  completion: ChatCompletionMessage;
  tokens: number;
  
  constructor(message: ChatMessage, completion: ChatCompletionMessage, tokens: number) {
    this.channelId = message.channelId;
    this.content = message.content;
    this.authorId = message.authorId;
    this.authorName = message.authorName;
    this.mentions = message.mentions;
    this.completion = completion;
    this.tokens = tokens;
  }
}

export class Bot {
  private chatService: ChatInterface;
  private llm: LLMInterface;
  private tools: ToolFunction[];
  private contextMessages = new Map<string, {message: ChatMessageHistory[], tokenCount: number}>();
  
  constructor(
    chatService: ChatInterface,
    llm: LLMInterface,
    tools: ToolFunction[]
  ) {
    this.chatService = chatService;
    this.llm = llm;
    this.tools = tools;
    
    this.chatService.on('message', this.onMessage.bind(this));
  }
  
  start() {
    this.chatService.start();
  }
  
  private async onMessage(message: ChatMessage) {
    const messageTokenCount = this.llm.getTokenCount(message.content);
    
    const contextMessage = this.contextMessages.get(message.channelId);
    const messages = contextMessage?.message || [];
    
    messages.push(
      new ChatMessageHistory(
        message, 
        { role: 'user', content: message.content, name: message.authorId },
        messageTokenCount,
      )
    );
    
    let totalTokenCount = (contextMessage?.tokenCount || 0) + messageTokenCount;
    
    // Keep context within limit
    while (totalTokenCount > config.maxTokenPerChannel && messages.length > 0) {
      const message = messages.shift();
      totalTokenCount -= message?.tokens || 0;
    }
    
    this.contextMessages.set(message.channelId, { message: messages, tokenCount: totalTokenCount });
    
    // Check if bot is mentioned or addressed directly
    if (
      message.mentions.includes(this.chatService.getBotId())
    ) {
      const sendTyping = () => {
        this.chatService.sendTyping(message.channelId);
      }

      const typingInterval = setInterval(() => sendTyping, 5000);
      sendTyping();
      
      try {
        const response = await this.generateResponse(message.channelId);
        clearInterval(typingInterval);
        await this.chatService.replyMessage(message, response.message);
        if (response.source) {
          await this.chatService.sendMessage(message.channelId, response.source);
        }
      } catch (error) {
        clearInterval(typingInterval);
        throw error;
      }

      console.log(
        "Message total count",
        messages.map((msg) => msg.content).length,
        "Message token count",
        contextMessage?.tokenCount || 0,
      );
    }
  }
  
  private isDirectMessage(message: ChatMessage): boolean {
    // Implement logic to determine if the message is a direct message to the bot
    return false; // Placeholder
  }
  
  private async generateResponse(
    channelId: string,
    functionCallInfos: string[] = [],
  ): Promise<{message: string, source?: string}> {
    const contextMessages = this.contextMessages.get(channelId);
    const messages = this.contextMessages.get(channelId)?.message || [];
    const chatMessageCompletions = messages.map((msg) => msg.completion);
    
    const systemPrompt = replacePlaceholders(
      config.systemPrompt,
      this.chatService
    );
    
    const systemMessage: ChatCompletionMessage = {
      role: 'system',
      content: systemPrompt,
    };
    
    // Create a Map to track users in the channel
    const channelUsers = new Map(
      messages.map(msg => [msg.authorId, msg.authorName])
    );
    
    const channelUsersSystemPrompt = Array.from(channelUsers.entries())
      .map(([id, name]) => `User ID: ${id} | ${name}`)
      .join('\n');
    
    const channelUsersSystemMessage: ChatCompletionMessage = {
      role: 'system',
      content: `Users in this channel:\n${channelUsersSystemPrompt}`,
    };

    const memory = await getMemory(channelId);

    const memorySystemMessage: ChatCompletionMessage = {
      role: 'system',
      content: `Memory (Notes that you have taken before):\n${memory}`,
    };

    const memoryInstructionSystemMessage: ChatCompletionMessage = {
      role: 'system',
      content: `Always proactively call \`addMemory\` function for any information the user shares that could be relevant for enhancing future interactions, even if the user doesn't explicitly request it. This includes all information about the user's preferences, goals, location, interests, relationships, and unique habits or contexts. Prioritize information that could improve response personalization, efficiency, and contextual relevance in the long term.`,
    };
    
    const functions = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
    
    const responseMessage = await this.llm.generateResponse(
      [...chatMessageCompletions, systemMessage, channelUsersSystemMessage, memorySystemMessage, memoryInstructionSystemMessage],
      functions
    );
    
    // Handle function calls if needed
    if (responseMessage.function_call) {
      console.log('Function call:', responseMessage.function_call, "Channel ID:", channelId);
      
      const functionResponse = await this.handleFunctionCall(
        responseMessage.function_call,
        channelId,
      );
      
      const response = JSON.stringify(functionResponse.response);
      const responseTokenCount = this.llm.getTokenCount(response);
      
      // Append function response to messages
      messages.push(new ChatMessageHistory(
        {
          channelId,
          content: functionResponse.info,
          authorId: this.chatService.getBotId(),
          authorName: this.chatService.getBotName(),
          mentions: [],
        },
        {
          role: 'function',
          name: responseMessage.function_call.name,
          content: JSON.stringify(functionResponse.response),
        },
        responseTokenCount,
      ));
      
      this.contextMessages.set(channelId, { message: messages, tokenCount: (contextMessages?.tokenCount || 0) + responseTokenCount });
      
      // Recurse to get final response
      return this.generateResponse(channelId, [...functionCallInfos, functionResponse.info]);
    }
    
    const source = functionCallInfos.length > 0 
    ? "### 🔍 Sumber\n" + functionCallInfos.map((info) => `- ${info}`).join('\n') 
    : undefined;

    // Remove function calls from messages
    const cleanedMessages = messages.filter(msg => !msg.completion.function_call);

    // Add bot response to context
    cleanedMessages.push(new ChatMessageHistory(
      {
      channelId,
      content: responseMessage.content || '',
      authorId: this.chatService.getBotId(),
      authorName: this.chatService.getBotName(),
      mentions: [],
      },
      {
      role: 'assistant',
      content: responseMessage.content || '',
      },
      this.llm.getTokenCount(responseMessage.content || ''),
    ));

    // If there's a source, add it to context
    if (source) {
      const sourceSystemMessage = `The answer you created above is generated from these sources:\n${source}`;
      cleanedMessages.push(new ChatMessageHistory(
      {
        channelId,
        content: sourceSystemMessage,
        authorId: this.chatService.getBotId(),
        authorName: this.chatService.getBotName(),
        mentions: [],
      },
      {
        role: 'system',
        content: sourceSystemMessage,
      },
      this.llm.getTokenCount(sourceSystemMessage),
      ));
    }

    // Update context with final token count calculated once
    this.contextMessages.set(channelId, { 
      message: cleanedMessages, 
      tokenCount: cleanedMessages.reduce((sum, msg) => sum + msg.tokens, 0) 
    });
    
    return { 
      message: responseMessage.content || 'Sorry, I could not generate a response.',
      source,
    };
  }
  
  private async handleFunctionCall(functionCall: any, channelId: string): Promise<{ response: any, info: string }> {
    const tool = this.tools.find((t) => t.name === functionCall.name);
    if (!tool) {
      throw new Error(`Tool not found: ${functionCall.name}`);
    }
    const args = { ...JSON.parse(functionCall.arguments || '{}'), channelId };
    const response = await tool.function(args);
    const info = tool.functionInfo(args);
    
    return { response, info };
  }
}
