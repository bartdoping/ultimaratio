// scripts/create-test-user.ts
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const testEmail = "test@fragenkreuzen.de";
    const testPassword = "test123456";
    
    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      console.log("✅ Test user already exists:", testEmail);
      return;
    }

    // User erstellen
    const hashedPassword = await hashPassword(testPassword);
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test",
        surname: "User",
        passwordHash: hashedPassword,
        role: "user",
        // subscriptionStatus: "free"
      }
    });

    console.log("✅ Test user created successfully:");
    console.log("📧 Email:", testEmail);
    console.log("🔑 Password:", testPassword);
    console.log("🆔 User ID:", user.id);
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
