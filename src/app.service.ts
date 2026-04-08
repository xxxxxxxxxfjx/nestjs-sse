import { Injectable, MessageEvent } from '@nestjs/common';
import { from, concatMap, delay, Observable, of, concat, map } from 'rxjs';

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
      reasoning_content?: string; // 深度思考内容 (DeepSeek 风格)
      content?: string;           // 正文内容 (Markdown)
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
export class AppService {
  getHello(): string {
    return 'SSE Multimodal AI Engine is Online!';
  }

  /**
   * 模拟一个高级 AI 的复杂响应流
   * 包含：思考 -> Markdown 逐字输出 -> 图片/附件插入 -> 结束标记
   */
  getSseStream(): Observable<MessageEvent> {
    const sessionId = `chat-session-${Math.random().toString(36).substring(7)}`;

    // 1. 模拟【深度思考】阶段 (Reasoning)
    const reasoningStep = '正在检索相关文档并构建 Markdown 响应...\n考虑用户的多模态需求，准备插入 NestJS 架构图...\n';
    const thoughtStream$ = of(reasoningStep).pipe(
      delay(500),
      map(text => ({
        data: this.formatChunk(sessionId, { reasoning_content: text }),
      })),
    );

    // 2. 模拟【Markdown 内容】逐字输出 (打字机效果)
    const markdownContent = `### 🚀 欢迎使用高级 SSE 接口\n\n这是一个支持 **Markdown** 和 **多模态** 的实时数据源。  \n\n` +
      `#### 功能特性：\n` +
      `- **实时性**: 基于 Server-Sent Events  \n` +
      `- **深度思考**: 支持思维链路展示  \n` +
      `- **多模态**: 动态插入多媒体资源  \n\n` +
      `下面为您展示 NestJS 的官方 Logo：\n\n`;

    const contentChunks = markdownContent.split('');
    const textStream$ = from(contentChunks).pipe(
      concatMap((char, index) => 
        of(char).pipe(delay(index === 0 ? 500 : 30)) // 第一段话稍等下，之后流畅输出
      ),
      map(char => ({
        data: this.formatChunk(sessionId, { content: char }),
      })),
    );

    // 3. 模拟【图片插入】(Multimodal)
    const imageStream$ = of(null).pipe(
      delay(800),
      map(() => ({
        data: this.formatChunk(sessionId, {
          multimodal: {
            type: 'image',
            url: 'https://nestjs.com/img/logo-small.svg',
            mime_type: 'image/svg+xml',
            metadata: { width: 100, height: 100 }
          }
        }),
      })),
    );

    // 4. 模拟【结束信号】
    const endStream$ = of(null).pipe(
      delay(500),
      map(() => ({
        data: this.formatChunk(sessionId, {}, 'stop'),
      })),
    );

    // 顺序执行：思考 -> 文本 -> 图片 -> 结束
    return concat(thoughtStream$, textStream$, imageStream$, endStream$) as unknown as Observable<MessageEvent>;
  }

  /** 格式化工具方法 */
  private formatChunk(id: string, delta: any, finish_reason: 'stop' | null = null): ChatChunk {
    return {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'sse-multimodal-demo-v1',
      choices: [{
        index: 0,
        delta: delta,
        finish_reason: finish_reason,
      }],
    };
  }
}
