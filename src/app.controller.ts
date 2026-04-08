import { Controller, Get, MessageEvent, Sse, Header } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Sse('sse')
  @Header('Content-Type', 'text/event-stream; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  sse(): Observable<MessageEvent> {
    return this.appService.getSseStream();
  }
}
