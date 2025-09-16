import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Starting E2E Test Global Setup...');

  try {
    // Launch browser for setup tasks
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Wait for the web server to be ready
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5000';

    console.log(`⏳ Waiting for server at ${baseURL}...`);

    // Attempt to connect to the server with retries
    let serverReady = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2-second intervals = 1 minute

    while (!serverReady && attempts < maxAttempts) {
      try {
        await page.goto(baseURL, { timeout: 5000 });
        serverReady = true;
        console.log('✅ Server is ready!');
      } catch (error) {
        attempts++;
        console.log(`⏳ Attempt ${attempts}/${maxAttempts} - Server not ready yet...`);
        await page.waitForTimeout(2000); // Wait 2 seconds before retry
      }
    }

    if (!serverReady) {
      throw new Error(`❌ Server at ${baseURL} did not become ready within ${maxAttempts * 2} seconds`);
    }

    // Set up test database state if needed
    if (process.env.NODE_ENV === 'development') {
      try {
        // Reset test data
        const response = await page.request.get('/api/test/reset');
        if (response.ok()) {
          console.log('✅ Test database reset successfully');
        }
      } catch (error) {
        console.log('⚠️ Could not reset test database (this may be expected)');
      }

      // Set up authentication for E2E tests in development
      try {
        const authResponse = await page.request.post('/api/auth/dev-login');
        if (authResponse.ok()) {
          console.log('✅ Development authentication set up');
        }
      } catch (error) {
        console.log('⚠️ Could not set up dev authentication (this may be expected)');
      }
    }

    await browser.close();
    console.log('🎭 E2E Test Global Setup Complete!');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;