const fs = require('fs');
const path = require('path');

// Configuration - adjust these values to match your setup
const seedFilePath = '../supabase/seed.sql'; // Path to your seed file

// Read the seed file
try {
  console.log(`Reading seed file from ${seedFilePath}...`);
  let seedContent = fs.readFileSync(seedFilePath, 'utf8');
  
  // Original file size for reference
  const originalSize = seedContent.length;
  
  // Remove storage creation statements
  // This pattern matches CREATE SCHEMA storage and any related statements
  console.log('Removing storage creation statements...');
  seedContent = seedContent.replace(/CREATE SCHEMA storage;/g, '-- CREATE SCHEMA storage; -- Removed to prevent conflicts');
  
  // Remove CREATE TABLE statements for storage schema
  seedContent = seedContent.replace(/CREATE TABLE storage\.[^\;]+;/g, '-- Storage table creation removed to prevent conflicts');
  
  // Remove storage extension statements if they exist
  seedContent = seedContent.replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+" WITH SCHEMA storage;/g, 
    '-- Storage extension creation removed to prevent conflicts');
  
  // Remove storage privileges/grants
  seedContent = seedContent.replace(/GRANT [^\;]+ ON SCHEMA storage [^\;]+;/g, 
    '-- Storage privileges removed to prevent conflicts');
  seedContent = seedContent.replace(/GRANT [^\;]+ ON [^\;]+ IN SCHEMA storage [^\;]+;/g, 
    '-- Storage object privileges removed to prevent conflicts');
  
  // Write the modified content back to the seed file
  fs.writeFileSync(seedFilePath, seedContent, 'utf8');
  
  const removedBytes = originalSize - seedContent.length;
  console.log(`Successfully modified seed file! Removed approximately ${removedBytes} bytes of storage-related SQL.`);
  
} catch (error) {
  console.error('Error processing the seed file:', error);
  process.exit(1);
}