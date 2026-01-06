import { BadRequestException } from '@nestjs/common';

/**
 * Custom exception for business rule violations
 * 
 * Reference: SPRINT_8_TRACK_D_HARDENING.md - Structured Error Handling
 */
export class BusinessRuleException extends BadRequestException {
    constructor(
        message: string,
        public readonly ruleViolated: string,
        public readonly context?: any,
    ) {
        super({
            message,
            details: {
                ruleViolated,
                context,
            },
        });
    }
}
