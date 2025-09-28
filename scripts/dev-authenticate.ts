#!/usr/bin/env tsx

/**
 * Development Authentication Helper
 *
 * This script helps authenticate a test admin user for development purposes.
 * It creates a session that can be used to test authenticated features like the team page.
 */

async function authenticateForDevelopment() {
  console.log('🔑 Authenticating for development...');

  try {
    const response = await fetch('http://localhost:5000/api/auth/dev-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Authentication successful!');
    console.log('👤 Logged in as:', result.user);
    console.log('🌐 You can now access authenticated pages like /team');
    console.log('🔍 Test the team API:', 'curl -X GET "http://localhost:5000/api/users" --cookie-jar /tmp/cookies.txt');

    return result;

  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

// Run authentication
authenticateForDevelopment().catch(console.error);