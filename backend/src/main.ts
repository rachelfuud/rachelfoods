import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { json } from 'express';

console.log('=== STARTING APPLICATION ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

async function bootstrap() {
  console.log('Bootstrap function called...');
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

  // Enable validation for all endpoints
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw error for extra properties
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically
      },
    }),
  );

  const port = process.env.PORT || 3001;
  console.log(`Attempting to listen on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log(`=== APPLICATION STARTED SUCCESSFULLY ON PORT ${port} ===`);
}

console.log('Calling bootstrap()...');
bootstrap().catch((error) => {
  console.error('=== BOOTSTRAP FAILED ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});
console.log('Bootstrap call initiated.');
