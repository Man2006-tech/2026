import { PrismaClient, UserStatus, VerificationStatus, RideStatus, ComplaintStatus, Role, CarType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding test data...');

    // initial clean up
    await prisma.booking.deleteMany();
    await prisma.ride.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.user.deleteMany();

    // 0. Create Admin User
    const adminUser = await prisma.user.create({
        data: {
            phone: '+923008888888',
            name: 'Super Admin',
            cnic: '00000-0000000-0',
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
        },
    });

    await prisma.otpCode.create({
        data: {
            phone: '+923008888888',
            code: '123456',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
            verified: true,
            userId: adminUser.id,
        },
    });

    // 1. Create Normal User (Passenger)
    const passenger = await prisma.user.create({
        data: {
            phone: '+923001234567',
            name: 'Test Passenger',
            cnic: '12345-1234567-1',
            role: Role.PASSENGER,
            status: UserStatus.ACTIVE,
        },
    });

    // 2. Create Driver with Vehicle
    const driverUser = await prisma.user.create({
        data: {
            phone: '+923007654321',
            name: 'Test Driver',
            cnic: '12345-7654321-1',
            role: Role.DRIVER,
            status: UserStatus.ACTIVE,
        },
    });

    const driver = await prisma.driver.create({
        data: {
            userId: driverUser.id,
            name: 'Test Driver',
            phone: '+923007654321',
            cnic: '12345-7654321-1',
            licenseNumber: 'LTV-1234',
            carName: 'Toyota Corolla',
            carColor: 'White',
            carType: CarType.ECONOMY,
            numberOfSeats: 4,
            carNumberPlate: 'ABC-123',
            profession: 'Driver',
            organization: 'Raahein',
            verificationStatus: VerificationStatus.VERIFIED,
        },
    });

    // 3. Create Specific Test Driver (Verified)
    const postmanUser = await prisma.user.create({
        data: {
            phone: '+923000000000',
            name: 'Postman Driver',
            cnic: '11111-1111111-1',
            role: Role.DRIVER,
            status: UserStatus.ACTIVE,
        },
    });

    await prisma.otpCode.create({
        data: {
            phone: '+923000000000',
            code: '123456',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
            verified: true,
            userId: postmanUser.id,
        },
    });

    await prisma.driver.create({
        data: {
            userId: postmanUser.id,
            name: 'Postman Driver',
            phone: '+923000000000',
            cnic: '11111-1111111-1',
            licenseNumber: 'POST-1234',
            carName: 'Honda Civic',
            carColor: 'Black',
            carType: CarType.COMFORT,
            numberOfSeats: 4,
            carNumberPlate: 'PST-000',
            profession: 'Tester',
            organization: 'Postman',
            verificationStatus: VerificationStatus.VERIFIED,
        },
    });

    // 4. Create Pending Driver (For Verification Testing)
    const pendingUser = await prisma.user.create({
        data: {
            phone: '+923009999999',
            name: 'Pending Driver',
            cnic: '99999-9999999-9',
            role: Role.DRIVER,
            status: UserStatus.ACTIVE,
        },
    });

    await prisma.otpCode.create({
        data: {
            phone: '+923009999999',
            code: '123456',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
            verified: true,
            userId: pendingUser.id,
        },
    });

    await prisma.driver.create({
        data: {
            userId: pendingUser.id,
            name: 'Pending Driver',
            phone: '+923009999999',
            cnic: '99999-9999999-9',
            licenseNumber: 'PEND-1234',
            carName: 'Suzuki Mehran',
            carColor: 'Grey',
            carType: CarType.ECONOMY,
            numberOfSeats: 4,
            carNumberPlate: 'PND-999',
            profession: 'Applicant',
            organization: 'None',
            verificationStatus: VerificationStatus.PENDING,
        },
    });

    // 2. Create a Test Ride
    const ride = await prisma.ride.create({
        data: {
            driverId: driver.id,
            from: 'NUST H-12, Islamabad',
            to: 'Giga Mall, Rawalpindi',
            status: RideStatus.SCHEDULED,
            isSuspicious: false,
            departureDate: new Date(),
            departureTime: new Date(),
            availableSeats: 4,
            totalSeats: 4,
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
