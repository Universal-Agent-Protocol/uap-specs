/**
 * Example: MCP to UAP Bridge
 *
 * This example shows how to wrap an existing MCP server as a UAP agent,
 * making it discoverable and usable via UAP protocol.
 */

import { createUAPAgentFromMCP } from '../src/index.js';

async function main() {
  console.log('\n===========================================');
  console.log('MCP to UAP Bridge Example');
  console.log('===========================================\n');

  // Example: Bridge the official MCP PostgreSQL server
  // Note: This requires the MCP server to be installed
  // npm install -g @modelcontextprotocol/server-postgres

  const postgresConfig = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: {
      // Set your PostgreSQL connection string
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost/mydb',
    },
  };

  try {
    console.log('Creating UAP agent from MCP PostgreSQL server...\n');

    // Create UAP agent that wraps the MCP server
    const postgresAgent = await createUAPAgentFromMCP(
      postgresConfig,
      'postgres',
      {
        name: 'PostgreSQL Database (MCP)',
        description: 'PostgreSQL database access via MCP compatibility layer',
        icon: 'https://www.postgresql.org/media/img/about/press/elephant.png',
        capabilities: ['PostgreSQL', 'Database', 'SQL'],
        provider: 'PostgreSQL + MCP Bridge',
        website: 'https://www.postgresql.org',
        pricing: 'Free (uses local PostgreSQL)',
      }
    );

    // Start the UAP agent
    await postgresAgent.start();

    const registration = postgresAgent.getRegistration();

    console.log('✓ MCP PostgreSQL server bridged successfully!\n');
    console.log('Agent Details:');
    console.log('─────────────────────────────────────────');
    console.log(`Name: ${registration.name}`);
    console.log(`Agent ID: ${registration.agentId}`);
    console.log(`Host: ${registration.host}:${registration.port}`);
    console.log(`Capabilities: ${registration.capabilities.join(', ')}`);
    console.log(`\nThis MCP server is now discoverable via UAP!`);
    console.log(`UAP clients can find and use it automatically.\n`);

    console.log('Press Ctrl+C to stop.\n');

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await postgresAgent.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('\n❌ Error creating MCP bridge:');
    console.error(error);
    console.error('\nMake sure:');
    console.error('1. The MCP server package is installed');
    console.error('2. Required environment variables are set');
    console.error('3. Any required services (like PostgreSQL) are running\n');
    process.exit(1);
  }
}

main();
