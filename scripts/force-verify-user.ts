import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function forceVerifyUser() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: tsx scripts/force-verify-user.ts <email>');
    process.exit(1);
  }

  console.log(`\n🔧 Force verifying email for: ${email}\n`);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log('❌ User not found');
    process.exit(1);
  }

  if (user.emailVerified) {
    console.log('✅ Email already verified - no action needed');
    process.exit(0);
  }

  // Force verify
  const result = await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null
    })
    .where(eq(users.id, user.id))
    .returning();

  console.log('✅ Email verification forced!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('User:', result[0].email);
  console.log('Email Verified:', result[0].emailVerified);
  console.log('Token Cleared:', result[0].emailVerificationToken === null);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ User can now log in with their password!\n');

  process.exit(0);
}

forceVerifyUser().catch(console.error);