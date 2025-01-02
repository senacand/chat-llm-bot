import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  botName: string;
  model: string;
  temperature: number;
  maxTokenPerChannel: number;
  systemPrompt: string;
  openAiApiKey: string;
  discordToken: string;
  weatherApiKey?: string;
  binderbyteApiKey?: string;
}

export const config: Config = {
  botName: process.env.BOT_NAME || 'YourBotName',
  model: process.env.MODEL || 'gpt-3.5-turbo',
  temperature: parseFloat(process.env.TEMPERATURE || '1'),
  maxTokenPerChannel: parseInt(process.env.MAX_TOKEN_PER_CHANNEL || '50000'),
  systemPrompt: process.env.SYSTEM_PROMPT || 'Your system prompt here...',
  openAiApiKey: process.env.OPENAI_KEY || '',
  discordToken: process.env.DISCORD_TOKEN || '',
  weatherApiKey: process.env.WEATHER_API_KEY,
  binderbyteApiKey: process.env.BINDERBYTE_API_KEY,
};
