import { PrismaClient, CarType, Role, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin User if not exists
    const adminPhone = '+923000000000';
    const adminUser = await prisma.user.upsert({
        where: { phone: adminPhone },
        update: {},
        create: {
            phone: adminPhone,
            name: 'Super Admin',
            cnic: '00000-0000000-0',
            role: Role.ADMIN,
            status: 'ACTIVE' as any,
        },
    });
    console.log(`Created Admin User: ${adminUser.name}`);

    // 2. Create Driver User
    const driverPhone = '+923001234567';
    const driverUser = await prisma.user.upsert({
        where: { phone: driverPhone },
        update: {},
        create: {
            phone: driverPhone,
            name: 'Test Driver',
            cnic: '12345-1234567-2',
            role: Role.DRIVER,
            status: 'ACTIVE' as any,
        },
    });
    console.log(`Created Driver User: ${driverUser.name}`);

    // 3. Create Driver Profile for the user
    await prisma.driver.upsert({
        where: { userId: driverUser.id },
        update: {},
        create: {
            userId: driverUser.id,
            name: 'Driver One',
            phone: driverUser.phone,
            cnic: '12345-1234567-1',
            licenseNumber: 'L-12345',
            carName: 'Civic',
            carColor: 'Black',
            carType: CarType.COMFORT,
            numberOfSeats: 4,
            carNumberPlate: 'ABC-123',
            profession: 'Driver',
            organization: 'Uber',
            verificationStatus: 'APPROVED',
        }
    });
    console.log(`Created Driver Profile for: ${driverUser.name}`);

    // 4. Create a Dummy Ride
    const driverProfile = await prisma.driver.findUnique({ where: { userId: driverUser.id } });

    if (driverProfile) {
        const ride = await prisma.ride.create({
            data: {
                driverId: driverProfile.id,
                from: 'Lahore',
                to: 'Islamabad',
                departureDate: new Date(),
                departureTime: new Date(),
                availableSeats: 2,
                totalSeats: 4,
                fare: 1500,
                status: 'SCHEDULED',
            }
        });
        console.log(`Created Dummy Ride with ID: ${ride.id}`);
    }

    // 5. Create a Dummy Complaint
    const complaint = await prisma.complaint.create({
        data: {
            userId: driverUser.id,
            targetId: adminUser.id, // Complaint against Admin/System
            subject: 'App Issue',
            description: 'The app crashes when I try to upload documents.',
            status: 'OPEN',
        }
    });
    console.log(`Created Dummy Complaint with ID: ${complaint.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
