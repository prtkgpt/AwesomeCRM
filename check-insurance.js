const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking clients for insurance data...\n');

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      hasInsurance: true,
      insuranceProvider: true,
      helperBeesReferralId: true
    }
  });

  console.log(`Total clients: ${clients.length}\n`);

  clients.forEach(client => {
    console.log(`Client: ${client.name}`);
    console.log(`  Has Insurance: ${client.hasInsurance}`);
    console.log(`  Provider: ${client.insuranceProvider || 'N/A'}`);
    console.log(`  Helper Bees ID: ${client.helperBeesReferralId || 'N/A'}`);
    console.log('');
  });

  const withInsurance = clients.filter(c => c.hasInsurance);
  console.log(`Clients with insurance: ${withInsurance.length}`);
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
