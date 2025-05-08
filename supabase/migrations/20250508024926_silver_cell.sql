/*
  # Add notes to transactions

  1. Changes
    - Add `note` column to `transactions` table
    - Allow null values for optional notes
*/

ALTER TABLE transactions 
ADD COLUMN note text NULL;