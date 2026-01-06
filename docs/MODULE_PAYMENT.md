# MODULE: PAYMENT

## Responsibility

Handles all monetary transactions including authorization, capture, refunds, and reconciliation.

## Core Entities

- Payment
- Transaction
- PaymentMethod
- PaymentStatus (PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED)

## Public Interfaces

- PaymentService.initiatePayment()
- PaymentService.confirmPayment()
- PaymentService.refund()
- Emits events: payment_authorized, payment_failed, payment_refunded

## Invariants & Rules

- A payment is immutable once CAPTURED
- Payment amount must match order total
- Refunds cannot exceed captured amount
- All failures must be explicitly categorized

## Dependencies

- Reads Order module (amounts, order status)
- Emits events to Notification module
- Integrates external payment gateways (adapter pattern)

## Explicit Non-Responsibilities

- Does NOT create or modify orders
- Does NOT apply business discounts
- Does NOT handle fraud scoring logic

## Audit & Risk Notes

- High compliance impact
- All operations must be logged
- Idempotency required for external gateway calls
