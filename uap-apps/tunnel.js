const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 4000 });
    console.log('\n===========================================');
    console.log('🌐 UAP Agent Directory - PUBLIC URL');
    console.log('===========================================');
    console.log(`\n✅ Your public URL: ${tunnel.url}\n`);
    console.log('Directory server is now accessible worldwide!');
    console.log('\nTest it:');
    console.log(`  curl ${tunnel.url}/health`);
    console.log(`  curl ${tunnel.url}/api/stats`);
    console.log(`  curl ${tunnel.url}/api/agents`);
    console.log('\n===========================================\n');

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit(0);
    });

    // Keep running
    process.on('SIGINT', () => {
      console.log('\nShutting down tunnel...');
      tunnel.close();
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
