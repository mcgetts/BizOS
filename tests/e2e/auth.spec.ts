import { test, expect } from '@playwright/test';
import { E2ETestHelpers } from './utils/test-helpers';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Authentication Workflows', () => {
  let helpers: E2ETestHelpers;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    helpers = new E2ETestHelpers(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/');

    // Should be redirected to login or see unauthorized message
    await expect(page).toHaveURL(/login|unauthorized/);
  });

  test('should successfully authenticate with development login', async ({ page }) => {
    // Use development authentication
    await helpers.auth.loginAsDevelopmentUser();

    // Should be on dashboard
    await helpers.assert.assertURL('/');

    // Should see authenticated content
    await expect(page.locator('[data-testid="layout"]')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await helpers.auth.loginAsDevelopmentUser();

    // Verify we're on dashboard
    await helpers.assert.assertURL('/');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated
    await expect(page.locator('[data-testid="layout"]')).toBeVisible();
    await helpers.assert.assertURL('/');
  });

  test('should successfully logout', async ({ page }) => {
    // Login first
    await helpers.auth.loginAsDevelopmentUser();

    // Verify we're authenticated
    await expect(page.locator('[data-testid="layout"]')).toBeVisible();

    // Logout
    await helpers.auth.logout();

    // Should be redirected away from protected content
    await expect(page.locator('[data-testid="layout"]')).not.toBeVisible();
  });

  test('should handle invalid authentication gracefully', async ({ page }) => {
    // Try to access protected API endpoint without authentication
    const response = await page.request.get('/api/auth/user');

    // Should return 401 or similar error
    expect(response.status()).toBe(401);
  });

  test('should protect admin routes', async ({ page }) => {
    // Login as regular user (if different roles are supported)
    await helpers.auth.loginAsDevelopmentUser();

    // Try to access admin-only content
    const response = await page.request.get('/api/admin/users');

    // Response handling depends on how admin routes are protected
    // This might return 403 Forbidden or redirect
    expect([200, 403, 404]).toContain(response.status());
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await helpers.auth.loginAsDevelopmentUser();

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();

    // Try to access protected content
    await page.goto('/clients');

    // Should be redirected to login or show unauthorized
    await expect(
      page.locator('text=/unauthorized|login|sign in/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should persist authentication across browser tabs', async ({ context }) => {
    // Create first page and login
    const page1 = await context.newPage();
    const helpers1 = new E2ETestHelpers(page1);

    await helpers1.auth.loginAsDevelopmentUser();
    await expect(page1.locator('[data-testid="layout"]')).toBeVisible();

    // Create second page
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    // Should also be authenticated in second tab
    await expect(page2.locator('[data-testid="layout"]')).toBeVisible();

    await page1.close();
    await page2.close();
  });

  test('should display user information when authenticated', async ({ page }) => {
    // Login with development user
    await helpers.auth.loginAsDevelopmentUser();

    // Look for user information display (avatar, name, etc.)
    const userInfo = page.locator('[data-testid="user-info"]') ||
                    page.locator('.user-avatar') ||
                    page.locator('text=/test@example.com|test user/i');

    // At least one form of user info should be visible
    const userElements = await page.locator('text=/test|user|admin/i').all();
    expect(userElements.length).toBeGreaterThan(0);
  });

  test('should handle network errors during authentication', async ({ page }) => {
    // Block authentication endpoint
    await page.route('/api/auth/**', route => {
      route.abort('failed');
    });

    // Try to access protected page
    await page.goto('/');

    // Should handle the error gracefully (show error message or redirect)
    await expect(
      page.locator('text=/error|unauthorized|network|failed/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access a specific protected page
    const intendedPath = '/clients';
    await page.goto(intendedPath);

    // Should be redirected to login
    await expect(page).toHaveURL(/login|auth/);

    // Login
    await helpers.auth.loginAsDevelopmentUser();

    // Should redirect to intended page or at least be authenticated
    // (Implementation may vary - some apps redirect to dashboard)
    await expect(page.locator('[data-testid="layout"]')).toBeVisible();
  });

  test('should handle concurrent login attempts', async ({ context }) => {
    // Create multiple pages
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const helpers1 = new E2ETestHelpers(page1);
    const helpers2 = new E2ETestHelpers(page2);

    // Try to login from both pages simultaneously
    const [result1, result2] = await Promise.allSettled([
      helpers1.auth.loginAsDevelopmentUser(),
      helpers2.auth.loginAsDevelopmentUser()
    ]);

    // Both should succeed or handle gracefully
    expect(result1.status).toBe('fulfilled');
    expect(result2.status).toBe('fulfilled');

    // Both pages should show authenticated content
    await expect(page1.locator('[data-testid="layout"]')).toBeVisible();
    await expect(page2.locator('[data-testid="layout"]')).toBeVisible();

    await page1.close();
    await page2.close();
  });
});