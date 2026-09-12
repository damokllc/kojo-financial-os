-- Migration: Add WEEKLY_REVIEW to MemoryCategory enum
-- Run this ONCE in your NeonDB SQL console at console.neon.tech
-- This fixes the "Error for enum MemoryCategory: WEEKLY_REVIEW" terminal error

ALTER TYPE "MemoryCategory" ADD VALUE IF NOT EXISTS 'WEEKLY_REVIEW';

-- Verify it was added:
-- SELECT enum_range(NULL::"MemoryCategory");
