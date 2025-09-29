import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkUserVerification() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: tsx scripts/check-user-verification.ts <email>');
    process.exit(1);
  }

  console.log(`\n🔍 Checking verification status for: ${email}\n`);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log('❌ User not found');
    process.exit(1);
  }

  console.log('User Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Name:', user.firstName, user.lastName);
  console.log('Email Verified:', user.emailVerified);
  console.log('Verification Token:', user.emailVerificationToken ? 'Present' : 'null');
  console.log('Auth Provider:', user.authProvider);
  console.log('Created At:', user.createdAt);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (user.emailVerified) {
    console.log('✅ Email is verified - user can log in');
  } else {
    console.log('❌ Email NOT verified - user cannot log in');
    if (user.emailVerificationToken) {
      console.log('\n📧 Verification link:');
      console.log(`   http://localhost:5000/verify-email?token=${user.emailVerificationToken}`);
    }
  }

  process.exit(0);
}

checkUserVerification().catch(console.error);