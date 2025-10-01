-- Create admin user for production
-- Replace these values before running:
-- EMAIL: your-email@example.com
-- PASSWORD_HASH: (generate with: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10).then(console.log)")

-- First, ensure default organization exists
INSERT INTO organizations (id, name, subdomain, slug, settings)
VALUES (gen_random_uuid(), 'Default Organization', 'default', 'default', '{}')
ON CONFLICT (subdomain) DO NOTHING;

-- Create admin user
-- IMPORTANT: Replace the email and password_hash below!
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  email_verified,
  auth_provider,
  default_organization_id,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',  -- CHANGE THIS EMAIL
  '$2a$10$REPLACE_WITH_YOUR_BCRYPT_HASH',  -- CHANGE THIS HASH
  'Admin',
  'User',
  'admin',
  true,
  'local',
  (SELECT id FROM organizations WHERE subdomain = 'default' LIMIT 1),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    email_verified = true;

-- Verify the user was created
SELECT email, role, email_verified FROM users WHERE email = 'admin@yourdomain.com';
