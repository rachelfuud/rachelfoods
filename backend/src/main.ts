import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://your-app.vercel.app',
      /\.vercel\.app$/,  // Allow all Vercel preview deployments
    ],
    credentials: true,
  });
  
  // Global prefix removed - controllers already have 'api/' prefix
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
