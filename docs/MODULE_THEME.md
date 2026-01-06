# MODULE: THEME

## Responsibility

Manages visual theming and branding configuration.

## Core Entities

- Theme
- ThemeConfiguration

## Public Interfaces

- ThemeService.getActiveTheme()
- Admin theme configuration APIs

## Invariants & Rules

- Only one active theme at a time
- Theme changes must be reversible

## Dependencies

- None (UI-facing only)

## Explicit Non-Responsibilities

- Does NOT contain business logic
- Does NOT affect pricing or orders

## Status

OPTIONAL – UI/UX Concern
