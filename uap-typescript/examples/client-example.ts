/**
 * Example: UAP Client
 *
 * This example shows how to create a UAP client that discovers
 * and interacts with agents on the network.
 */

import { UAPClient } from '../src/index';

async function main() {
  // Create UAP client
  const client = new UAPClient({
    enableMDNS: true, // Auto-discover agents via mDNS
  });

  // Listen for discovered agents
  client.on('agent-discovered', (agent) => {
    console.log(`\n✓ Discovered: ${agent.name}`);
    console.log(`  ID: ${agent.agentId}`);
    console.log(`  Host: ${agent.host}:${agent.port}`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`  Load: ${agent.load}%`);
    if (agent.provider) console.log(`  Provider: ${agent.provider}`);
    if (agent.pricing) console.log(`  Pricing: ${agent.pricing}`);
  });

  client.on('agent-lost', (agent) => {
    console.log(`\n✗ Lost: ${agent.name}`);
  });

  // Listen for notifications from agents
  client.on('notification', (notification) => {
    console.log('\n📢 Notification:', notification);
  });

  // Start discovery
  await client.start();

  console.log('\n===========================================');
  console.log('UAP Client Started!');
  console.log('===========================================');
  console.log('Discovering agents on the network...\n');

  // Wait a bit for discovery
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Show all discovered agents
  const agents = client.getAgents();
  console.log(`\nFound ${agents.length} agent(s):`);
  agents.forEach((agent, i) => {
    console.log(`${i + 1}. ${agent.name} (${agent.agentId})`);
  });

  if (agents.length === 0) {
    console.log('\nNo agents found. Make sure an agent is running.');
    console.log('Try running: npm run example:agent');
    await client.stop();
    return;
  }

  // Example: Find calculator agents
  console.log('\n\n===========================================');
  console.log('Example: Using Calculator Agent');
  console.log('===========================================\n');

  const calculators = client.discover({
    capabilities: ['Calculator'],
    status: 'Online',
  });

  if (calculators.length > 0) {
    const calc = calculators[0];
    console.log(`Using: ${calc.name}\n`);

    try {
      // Call tool directly by agent ID
      console.log('Calling add(5, 3)...');
      const addResult = await client.callTool(calc.agentId, 'add', { a: 5, b: 3 });
      console.log(`Result: ${addResult.result}\n`);

      console.log('Calling multiply(4, 7)...');
      const multiplyResult = await client.callTool(calc.agentId, 'multiply', { a: 4, b: 7 });
      console.log(`Result: ${multiplyResult.result}\n`);

      console.log('Calling divide(10, 2)...');
      const divideResult = await client.callTool(calc.agentId, 'divide', { a: 10, b: 2 });
      console.log(`Result: ${divideResult.result}\n`);

      // Example: Auto tool calling (finds best agent automatically)
      console.log('\n===========================================');
      console.log('Example: Auto Tool Calling');
      console.log('===========================================\n');

      console.log('Calling subtract with auto agent selection...');
      const autoResult = await client.callToolAuto('Calculator', 'subtract', {
        a: 100,
        b: 42,
      });
      console.log(`Result: ${autoResult.result}\n`);

      // Example: Async operation with progress
      console.log('\n===========================================');
      console.log('Example: Async Operation');
      console.log('===========================================\n');

      console.log('Starting slow computation (async)...');
      const slowResult = await client.callTool(calc.agentId, 'slowCompute', { value: 21 });
      console.log(`Async result: ${JSON.stringify(slowResult)}\n`);

      // Example: Get agent status
      console.log('\n===========================================');
      console.log('Example: Agent Status');
      console.log('===========================================\n');

      const status = await client.getStatus(calc.agentId);
      console.log(`Agent: ${status.agentId}`);
      console.log(`Status: ${status.status}`);
      console.log(`Load: ${status.load}%`);
      console.log(`Queue Depth: ${status.queueDepth}\n`);

      // Example: Ping agent
      const latency = await client.ping(calc.agentId);
      console.log(`Ping latency: ${latency}ms\n`);
    } catch (error) {
      console.error('Error calling tool:', error);
    }
  } else {
    console.log('No calculator agents found.');
  }

  // Keep running to receive notifications
  console.log('\n===========================================');
  console.log('Client is running. Press Ctrl+C to stop.');
  console.log('===========================================\n');

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
