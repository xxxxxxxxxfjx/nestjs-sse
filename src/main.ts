import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. 开启 CORS，允许前端 fetchEventSource 跨域请求
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);

  // 2. 开启 Webpack 热更新逻辑 (配合 start:dev 使用)
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
