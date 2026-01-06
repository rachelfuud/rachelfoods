# MODULE: CATEGORY

## Responsibility

Organizes products into logical groupings for browsing and discovery.

## Core Entities

- Category
- CategoryHierarchy

## Public Interfaces

- CategoryService.listCategories()
- CategoryService.assignProduct()

## Invariants & Rules

- Category hierarchy must be acyclic
- Products may belong to multiple categories

## Dependencies

- Read by Product module

## Explicit Non-Responsibilities

- Does NOT own products
- Does NOT manage pricing

## Status

STABLE – Low risk, minimal logic
