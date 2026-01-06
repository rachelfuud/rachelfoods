# MODULE: REFERRAL

## Responsibility

Manages referral relationships, rewards eligibility, and referral tracking.

## Core Entities

- Referral
- ReferralReward
- ReferralStatus (PENDING, QUALIFIED, REWARDED, EXPIRED)

## Public Interfaces

- ReferralService.applyReferral()
- ReferralService.validateReferral()
- Admin reporting queries

## Invariants & Rules

- A user cannot refer themselves
- Rewards granted once per qualified referral
- Referral codes are immutable

## Dependencies

- Reads Order module (qualification checks)
- Reads Payment module (successful payment confirmation)

## Explicit Non-Responsibilities

- Does NOT issue payments directly
- Does NOT send notifications
- Does NOT override fraud decisions

## Audit & Risk Notes

- High fraud potential
- All reward grants must be auditable
- Manual overrides should be logged
