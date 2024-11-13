import { ChatInterface } from '../core/chat/chat-interface';

export function replacePlaceholders(
  template: string,
  chatService: ChatInterface
): string {
  const nowUtc = new Date().toUTCString();

  return template
    .replace(/%time%/g, nowUtc)
    .replace(/%botName%/g, chatService.getBotName())
    .replace(/%botId%/g, chatService.getBotId());
}
