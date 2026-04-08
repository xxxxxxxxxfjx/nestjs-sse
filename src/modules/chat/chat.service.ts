import { Injectable, MessageEvent, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';

/** 模仿 OpenAI/DeepSeek 格式的多模态数据模型 */
interface ChatChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: 'assistant';
      reasoning_content?: string; // 深度思考内容
      content?: string;           // 正文内容
      multimodal?: {              // 复杂多模态支持
        type: 'image' | 'chart' | 'file';
        url?: string;
        mime_type?: string;
        metadata?: any;
      };
    };
    finish_reason: 'stop' | 'length' | null;
  }[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private model: ChatOpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.configService.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1');

    this.logger.log(`Initializing ChatService with BaseURL: ${baseURL}`);
    if (!apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not defined in environment variables!');
    } else {
      this.logger.log('DEEPSEEK_API_KEY loaded successfully (length: ' + apiKey.length + ')');
    }

    this.model = new ChatOpenAI({
      modelName: 'deepseek-chat',
      apiKey: apiKey,
      configuration: {
        baseURL: baseURL,
      },
      temperature: 0.7,
      streaming: true,
    });
  }

  getSseStream(userMessage: string = "你好，请自我介绍一下。"): Observable<MessageEvent> {
    this.logger.log(`Starting SSE stream for message: "${userMessage}"`);
    const sessionId = `chat-session-${Math.random().toString(36).substring(7)}`;

    return new Observable<MessageEvent>((subscriber) => {
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个有用的助手。请使用 Markdown 格式回答。'],
        ['human', '{input}']
      ]);

      const chain = prompt.pipe(this.model);

      (async () => {
        try {
          const stream = await chain.streamEvents({ input: userMessage }, { version: 'v2' });

          for await (const chunk of stream) {
            if (chunk.event === 'on_chat_model_stream') {
              const aiChunk = chunk.data.chunk;
              const content = aiChunk.content;
              const reasoningContent = aiChunk.additional_kwargs?.reasoning_content;

              if (reasoningContent) {
                 subscriber.next({
                    data: this.formatChunk(sessionId, { reasoning_content: reasoningContent }),
                 });
              } else if (content) {
                 subscriber.next({
                    data: this.formatChunk(sessionId, { content: content.toString() }),
                 });
              }
            }
          }

          // 发送完成信号
          subscriber.next({
            data: this.formatChunk(sessionId, {}, 'stop'),
          });
          subscriber.complete();

        } catch (error) {
          this.logger.error('Error during LLM stream generation', error);
          subscriber.next({
             data: this.formatChunk(sessionId, { content: "\n\n**请求出错，请检查 API Key 和网络配置**" }, "stop")
          });
          subscriber.complete();
        }
      })();
    });
  }

  private formatChunk(id: string, delta: any, finish_reason: 'stop' | null = null): ChatChunk {
    return {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'deepseek-chat',
      choices: [{
        index: 0,
        delta: delta,
        finish_reason: finish_reason,
      }],
    };
  }
}
