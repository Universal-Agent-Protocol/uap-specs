/**
 * Example: Simple UAP Agent
 *
 * This example shows how to create a basic UAP agent that provides
 * a simple calculator capability.
 */

import { UAPAgent } from '../src/index';

async function main() {
  // Create a simple calculator agent
  const agent = new UAPAgent({
    name: 'Calculator Agent',
    description: 'Performs basic arithmetic operations',
    icon: 'https://example.com/calculator-icon.png',
    capabilities: ['Calculator', 'Math'],
    provider: 'Example Corp',
    website: 'https://example.com',
    pricing: 'Free',

    tools: {
      add: {
        name: 'add',
        description: 'Add two numbers',
        parameters: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
        handler: async (params) => {
          const { a, b } = params;
          return { result: a + b };
        },
      },

      subtract: {
        name: 'subtract',
        description: 'Subtract two numbers',
        parameters: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
        handler: async (params) => {
          const { a, b } = params;
          return { result: a - b };
        },
      },

      multiply: {
        name: 'multiply',
        description: 'Multiply two numbers',
        parameters: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
        handler: async (params) => {
          const { a, b } = params;
          return { result: a * b };
        },
      },

      divide: {
        name: 'divide',
        description: 'Divide two numbers',
        parameters: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
        handler: async (params) => {
          const { a, b } = params;
          if (b === 0) {
            throw new Error('Division by zero');
          }
          return { result: a / b };
        },
      },

      // Example async operation
      slowCompute: {
        name: 'slowCompute',
        description: 'Perform a slow computation',
        parameters: [
          { name: 'value', type: 'number', required: true },
        ],
        async: true, // This runs in background
        handler: async (params, context) => {
          const { value } = params;

          // Simulate long computation
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            context?.updateProgress?.(i);
          }

          const result = value * 2; // Simple computation
          return { result };
        },
      },
    },
  });

  // Start the agent
  await agent.start();

  console.log('\n===========================================');
  console.log('Calculator Agent Started!');
  console.log('===========================================');
  console.log(`Agent ID: ${agent.getRegistration().agentId}`);
  console.log(`Name: ${agent.getRegistration().name}`);
  console.log(`Host: ${agent.getRegistration().host}`);
  console.log(`Port: ${agent.getRegistration().port}`);
  console.log(`Capabilities: ${agent.getRegistration().capabilities.join(', ')}`);
  console.log('\nAgent is now discoverable on the network via mDNS.');
  console.log('Clients can discover and use this agent automatically.');
  console.log('\nPress Ctrl+C to stop.\n');

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await agent.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
