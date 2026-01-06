# RachelFoods Platform – Copilot Context

This project is NOT a generic ecommerce system.

## Core Principles
- Seller must confirm orders before payment
- Human-assisted commerce, not full automation
- Food-specific workflows
- Seller retains full control

## Key Features
- Kitchen Refill system
- Custom product requests
- Distance + weight–based shipping
- Multi-channel communication
- Referral and loyalty programs
- Multi-level role-based access control
- Shipping Engine with provider abstraction

## Non-Negotiable Rules
- Do NOT assume automatic order fulfillment
- Do NOT bypass seller confirmation
- Do NOT use generic ecommerce order flows
- All shipping must go through the Shipping Engine
- Providers do not control business logic

## Development Guidance
- One module at a time
- Read docs before writing code
- Follow module boundaries strictly
