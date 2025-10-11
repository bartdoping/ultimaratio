// scripts/seed-test-user.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestUser() {
  try {
    console.log("🌱 Seeding test user...");
    
    const testEmail = "test@fragenkreuzen.de";
    const testPassword = "test123456";
    
    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      console.log("✅ Test user already exists:", testEmail);
      console.log("🔑 Password:", testPassword);
      return;
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    // User erstellen
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test",
        surname: "User",
        passwordHash: hashedPassword,
        role: "user",
        subscriptionStatus: "free",
        emailVerifiedAt: new Date() // Sofort verifiziert
      }
    });

    console.log("✅ Test user created successfully!");
    console.log("📧 Email:", testEmail);
    console.log("🔑 Password:", testPassword);
    console.log("🆔 User ID:", user.id);
    console.log("📧 Email verified:", user.emailVerifiedAt ? "Yes" : "No");
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUser();
