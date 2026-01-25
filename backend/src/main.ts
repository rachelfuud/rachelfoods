import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  // Configure JSON middleware with raw body for webhook route
  app.use('/api/payments/webhook', json({ verify: (req: any, res, buf) => { req.rawBody = buf; } }));

  // Enable CORS with environment-based configuration
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
      'https://rachelfoods.com',
      'https://www.rachelfoods.com',
      'https://frontend-production-1660.up.railway.app', // Railway frontend
    ]
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
    ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix removed - controllers already have 'api/' prefix
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(3001, '0.0.0.0');
  console.log(`Application is running on: http://localhost:3001`);
}
bootstrap();
