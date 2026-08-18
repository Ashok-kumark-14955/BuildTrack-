#!/usr/bin/env node
/**
 * Migration script: Add deletedBeams, customBeams, deletedNodes columns to the drawings table.
 * 
 * This script adds the grid-editor columns that are required for beam/node deletion
 * and custom beam features to persist to the backend.
 * 
 * IMPORTANT: This script must be run as a Catalyst Advanced I/O Function, not locally.
 * 
 * Usage:
 *   1. Deploy this as a one-time Catalyst Function
 *   2. Execute it via the Catalyst console or API
 *   3. OR use the Catalyst console to manually add the columns:
 *      - deletedBeams (text)
 *      - customBeams (text)  
 *      - deletedNodes (text)
 */

import catalyst from 'zcatalyst-sdk-node';

export async function addBeamColumns(req, res) {
  try {
    console.log('🚀 Starting migration: Adding beam/node editor columns to drawings table...');
    
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    // These columns support the grid editor features:
    // - deletedBeams: Array of beam IDs that have been deleted (JSON string in DataStore)
    // - customBeams: Array of {from, to} objects for manually added beams (JSON string)
    // - deletedNodes: Array of node codes that have been deleted (JSON string)
    const columnsToAdd = [
      { name: 'deletedBeams', type: 'text' },
      { name: 'customBeams', type: 'text' },
      { name: 'deletedNodes', type: 'text' },
    ];
    
    const results = [];
    
    for (const col of columnsToAdd) {
      try {
        console.log(`\n📝 Adding column: ${col.name} (${col.type})...`);
        
        // Use ZCQL ALTER TABLE to add the column
        const query = `ALTER TABLE drawings ADD ${col.name} ${col.type}`;
        await zcql.executeZCQLQuery(query);
        
        console.log(`✅ Column ${col.name} added successfully`);
        results.push({ column: col.name, status: 'added' });
      } catch (err) {
        // If column already exists, that's OK — skip it
        if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
          console.log(`ℹ️  Column ${col.name} already exists — skipping`);
          results.push({ column: col.name, status: 'exists' });
        } else {
          console.error(`❌ Failed to add column ${col.name}:`, err.message);
          results.push({ column: col.name, status: 'error', error: err.message });
        }
      }
    }
    
    console.log('\n✨ Migration complete!');
    res.status(200).json({ ok: true, results });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ ok: false, error: error.message });
  }
}
