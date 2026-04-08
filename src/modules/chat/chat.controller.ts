import { Controller, Get, MessageEvent, Sse, Header, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse('sse')
  @Header('Content-Type', 'text/event-stream; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  sse(@Query('input') input?: string): Observable<MessageEvent> {
    const defaultInput = '你好，请用一段简短的话自我介绍一下。';
    return this.chatService.getSseStream(input || defaultInput);
  }
}
