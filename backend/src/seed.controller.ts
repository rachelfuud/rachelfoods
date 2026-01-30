import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('api/admin')
export class SeedController {
    constructor(private prisma: PrismaService) { }

    @Post('seed')
    @HttpCode(HttpStatus.OK)
    async seedDatabase() {
        try {
            // Run the seed script
            const { stdout, stderr } = await execAsync('npm run prisma:seed', {
                cwd: process.cwd(),
                env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
            });

            return {
                success: true,
                message: 'Database seeded successfully',
                output: stdout,
                errors: stderr || null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Seed failed',
                error: error.message,
                output: error.stdout,
                errors: error.stderr,
            };
        }
    }
}
