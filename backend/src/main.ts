import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { json } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { validateEnv } from './config/env.validation';

console.log('=== STARTING APPLICATION ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

async function bootstrap() {
  // Validate environment variables FIRST (fail fast on configuration errors)
  validateEnv();

  console.log('Bootstrap function called...');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  // Enable compression (gzip/brotli) for 70% smaller responses
  // FREE optimization - reduces bandwidth usage dramatically
  app.use(compression());

  // Configure JSON middleware with raw body ONLY for webhook route
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/api/payments/webhook') {
      json({ verify: (req: any, res, buf) => { req.rawBody = buf; } })(req, res, next);
    } else {
      next();
    }
  });

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

  // Security hardening with Helmet (FREE)
  // Content Security Policy to prevent XSS attacks
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "*.paypal.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "*.stripe.com", "*.cloudinary.com"],
        connectSrc: ["'self'", "*.stripe.com", "*.paypal.com"],
        frameSrc: ["'self'", "js.stripe.com", "*.paypal.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

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
