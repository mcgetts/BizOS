import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E Test Global Teardown...');

  try {
    // Clean up any global resources if needed

    // In development, we might want to clean up test data
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Development teardown complete');
    }

    console.log('✅ E2E Test Global Teardown Complete!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;