import { Bot } from './core/bot';
import { OpenAILLM } from './core/llm/openai-llm';
import { DiscordChat } from './core/chat/discord-chat';
import { tools } from './tools';

require('dotenv').config();

// Initialize LLM
const llm = new OpenAILLM();

// Initialize Chat Service
const chatService = new DiscordChat();

// Initialize and start bot with tools
const bot = new Bot(chatService, llm, tools);
bot.start();
