import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Register a new buyer account
     * POST /api/auth/register
     */
    @Post('register')
    @ApiOperation({ summary: 'Register a new buyer account' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 400, description: 'Invalid registration data' })
    async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
        return this.authService.register(registerDto);
    }

    /**
     * Login with email and password
     * POST /api/auth/login
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
        return this.authService.login(loginDto);
    }

    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refresh(@Body('refreshToken') refreshToken: string): Promise<AuthResponse> {
        return this.authService.refreshAccessToken(refreshToken);
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    async logout(@Req() req: any): Promise<{ message: string }> {
        await this.authService.logout(req.user.id);
        return { message: 'Logged out successfully' };
    }
}
