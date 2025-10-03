// scripts/verify-admin.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyAdmin() {
  console.log('🔧 Verifiziere Admin-User...')
  
  const adminEmail = 'info@ultima-rat.io'
  
  const user = await prisma.user.findUnique({
    where: { email: adminEmail }
  })
  
  if (!user) {
    console.error('❌ Admin-User nicht gefunden!')
    return
  }
  
  console.log('👤 Admin-User gefunden:', {
    email: user.email,
    name: user.name,
    surname: user.surname,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt
  })
  
  if (!user.emailVerifiedAt) {
    console.log('🔓 Verifiziere Admin-User...')
    await prisma.user.update({
      where: { email: adminEmail },
      data: { emailVerifiedAt: new Date() }
    })
    console.log('✅ Admin-User erfolgreich verifiziert!')
  } else {
    console.log('✅ Admin-User bereits verifiziert!')
  }
  
  await prisma.$disconnect()
}

verifyAdmin().catch(console.error)
