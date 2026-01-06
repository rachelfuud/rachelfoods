# MODULE: NOTIFICATION

## Responsibility

Delivers system-generated notifications to users and admins across supported channels.

## Core Entities

- Notification
- NotificationChannel (EMAIL, SMS, PUSH)
- NotificationTemplate

## Public Interfaces

- NotificationService.send()
- NotificationService.sendBulk()
- Event listeners for domain events

## Invariants & Rules

- Notifications must be idempotent
- Failed delivery attempts must be logged
- Templates must be versioned

## Dependencies

- Subscribes to Order and Payment events
- Uses external messaging providers

## Explicit Non-Responsibilities

- Does NOT decide business logic triggers
- Does NOT mutate domain entities
- Does NOT retry indefinitely

## Audit & Risk Notes

- Delivery failures are operational signals
- User communication must be traceable
