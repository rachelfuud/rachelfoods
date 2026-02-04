/**
 * Environment Variable Validation
 * FREE Safety Feature: Catches missing/invalid env vars at startup
 * Prevents production crashes from configuration errors
 */

import { z } from 'zod';

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

    // Authentication
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    // Stripe Payment
    STRIPE_SECRET_KEY: z
        .string()
        .startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_'),
    STRIPE_WEBHOOK_SECRET: z
        .string()
        .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

    // Email Configuration (optional - supports multiple providers)
    EMAIL_PROVIDER: z
        .enum(['console', 'sendgrid', 'mailgun', 'ses'])
        .default('console'),

    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_FROM_EMAIL: z.string().email().optional(),

    MAILGUN_API_KEY: z.string().optional(),
    MAILGUN_DOMAIN: z.string().optional(),
    MAILGUN_FROM_EMAIL: z.string().email().optional(),

    AWS_SES_REGION: z.string().optional(),
    AWS_SES_ACCESS_KEY_ID: z.string().optional(),
    AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_SES_FROM_EMAIL: z.string().email().optional(),

    // App Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
    FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').optional(),

    // Admin Seed (optional - for initial setup)
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables detected:');
        console.error(JSON.stringify(parsed.error.format(), null, 2));
        console.error('\n📋 Required Environment Variables:');
        console.error('  - DATABASE_URL (PostgreSQL connection string)');
        console.error('  - JWT_SECRET (min 32 chars)');
        console.error('  - JWT_REFRESH_SECRET (min 32 chars)');
        console.error('  - STRIPE_SECRET_KEY (sk_test_* or sk_live_*)');
        console.error('  - STRIPE_WEBHOOK_SECRET (whsec_*)');
        console.error('\n💡 See .env.example for reference');
        process.exit(1);
    }

    // Additional validation for email providers
    const { EMAIL_PROVIDER } = parsed.data;

    if (EMAIL_PROVIDER === 'sendgrid' && !parsed.data.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
        process.exit(1);
    }

    if (EMAIL_PROVIDER === 'mailgun' && !parsed.data.MAILGUN_API_KEY) {
        console.error('❌ MAILGUN_API_KEY is required when EMAIL_PROVIDER=mailgun');
        process.exit(1);
    }

    if (EMAIL_PROVIDER === 'ses' && !parsed.data.AWS_SES_ACCESS_KEY_ID) {
        console.error('❌ AWS_SES_ACCESS_KEY_ID is required when EMAIL_PROVIDER=ses');
        process.exit(1);
    }

    console.log('✅ Environment variables validated successfully');
    console.log(`   - Environment: ${parsed.data.NODE_ENV}`);
    console.log(`   - Email Provider: ${parsed.data.EMAIL_PROVIDER}`);
    console.log(`   - Port: ${parsed.data.PORT}`);

    return parsed.data;
}
