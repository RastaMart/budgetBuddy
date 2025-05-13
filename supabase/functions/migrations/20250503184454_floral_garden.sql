/*
  # Add icon column to accounts table

  1. Changes
    - Add `icon` column to `accounts` table
    - Set default value to 'wallet'
*/

ALTER TABLE accounts 
ADD COLUMN icon text NOT NULL DEFAULT 'wallet';