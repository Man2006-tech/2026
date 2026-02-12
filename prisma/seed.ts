import { PrismaClient, UserStatus, VerificationStatus, RideStatus, ComplaintStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding test data...');

    // 1. Ensure we have a Passenger and a Driver
    const passenger = await prisma.user.upsert({
        where: { phone: '+923000000001' },
        update: {},
        create: {
            phone: '+923000000001',
            name: 'Test Passenger',
            cnic: '12345-1234567-1',
            role: Role.PASSENGER,
            status: UserStatus.ACTIVE,
        },
    });

    const driverUser = await prisma.user.upsert({
        where: { phone: '+923000000002' },
        update: {},
        create: {
            phone: '+923000000002',
            name: 'Test Driver User',
            cnic: '12345-1234567-2',
            role: Role.DRIVER,
            status: UserStatus.ACTIVE,
        },
    });

    const driver = await prisma.driver.upsert({
        where: { userId: driverUser.id },
        update: {},
        create: {
            userId: driverUser.id,
            name: driverUser.name,
            phone: driverUser.phone,
            cnic: driverUser.cnic,
            licenseNumber: 'ABC-123-XYZ',
            verificationStatus: VerificationStatus.APPROVED,
        },
    });

    // 2. Create a Test Ride
    const ride = await prisma.ride.create({
        data: {
            driverId: driver.id,
            origin: 'NUST H-12, Islamabad',
            destination: 'Centaurus Mall, Islamabad',
            status: RideStatus.SCHEDULED,
            isSuspicious: false,
        },
    });

    // 3. Create a Test Complaint
    await prisma.complaint.create({
        data: {
            userId: passenger.id,
            targetId: driver.id,
            subject: 'Wait Time',
            description: 'The driver was late for more than 15 minutes.',
            status: ComplaintStatus.OPEN,
        },
    });

    console.log('Seed completed successfully!');
    console.log(`Created Ride ID: ${ride.id}`);
    console.log(`Created Complaint for User: ${passenger.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
