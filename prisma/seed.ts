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

    // 3b. Create Second Driver User (Driver 2)
    const driverPhone2 = '+923009999999';
    const driverUser2 = await prisma.user.upsert({
        where: { phone: driverPhone2 },
        update: {},
        create: {
            phone: driverPhone2,
            name: 'Second Driver',
            cnic: '99999-9999999-9',
            role: Role.DRIVER,
            status: 'ACTIVE' as any,
        },
    });
    console.log(`Created Second Driver User: ${driverUser2.name}`);

    // Create Driver Profile for Driver 2
    await prisma.driver.upsert({
        where: { userId: driverUser2.id },
        update: {},
        create: {
            userId: driverUser2.id,
            name: 'Driver Two',
            phone: driverUser2.phone,
            cnic: '99999-9999999-9',
            licenseNumber: 'L-99999',
            carName: 'Corolla',
            carColor: 'White',
            carType: CarType.ECONOMY,
            numberOfSeats: 4,
            carNumberPlate: 'XYZ-999',
            profession: 'Driver',
            organization: 'Careem',
            verificationStatus: 'APPROVED',
        }
    });
    console.log(`Created Driver Profile for: ${driverUser2.name}`);

    // 4. Create a Dummy Ride
    const driverProfile = await prisma.driver.findUnique({ where: { userId: driverUser.id } });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (driverProfile) {
        const ride = await prisma.ride.create({
            data: {
                driverId: driverProfile.id,
                from: 'Lahore',
                to: 'Islamabad',
                departureDate: tomorrow,
                departureTime: tomorrow,
                availableSeats: 2,
                totalSeats: 4,
                fare: 1500,
                status: 'SCHEDULED',
            }
        });
        console.log(`Created Dummy Ride with ID: ${ride.id}`);
    }

    // 3c. Create Passenger User
    const passengerPhone = '+923005555555';
    const passengerUser = await prisma.user.upsert({
        where: { phone: passengerPhone },
        update: {},
        create: {
            phone: passengerPhone,
            name: 'Test Passenger',
            cnic: '55555-5555555-5',
            role: Role.PASSENGER,
            status: 'ACTIVE' as any,
        },
    });
    console.log(`Created Passenger User: ${passengerUser.name}`);

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

    // 3d. Create Second Passenger
    const passengerPhone2 = '+923008888888';
    const passengerUser2 = await prisma.user.upsert({
        where: { phone: passengerPhone2 },
        update: {},
        create: {
            phone: passengerPhone2,
            name: 'Another Passenger',
            cnic: '88888-8888888-8',
            role: Role.PASSENGER,
            status: 'ACTIVE' as any,
        },
    });
    console.log(`Created Second Passenger: ${passengerUser2.name}`);

    // 6. Create Pending Bookings for Driver One's Ride
    // Re-fetch the ride to ensure we have it in scope if it was block-scoped previously,
    // or just rely on the fact that we are in the main function.
    // However, the 'ride' variable was created inside an 'if (driverProfile)' block earlier.
    // We need to fetch the ride again to be safe and correct.

    if (driverProfile) {
        // Find the ride we created/exist for this driver
        const ride = await prisma.ride.findFirst({
            where: { driverId: driverProfile.id },
            orderBy: { createdAt: 'desc' }
        });

        if (ride) {
            await prisma.booking.create({
                data: {
                    rideId: ride.id,
                    passengerId: passengerUser.id,
                    seatsBooked: 1,
                    status: 'PENDING',
                }
            });
            console.log(`Created Pending Booking for: ${passengerUser.name}`);

            await prisma.booking.create({
                data: {
                    rideId: ride.id,
                    passengerId: passengerUser2.id,
                    seatsBooked: 2,
                    status: 'PENDING',
                }
            });
            console.log(`Created Pending Booking for: ${passengerUser2.name}`);
        }
    }

    // 7. Create a COMPLETED Ride and Booking for Review Testing
    if (driverProfile) {
        // Create a past ride
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const completedRide = await prisma.ride.create({
            data: {
                driverId: driverProfile.id,
                from: 'Islamabad',
                to: 'Lahore',
                departureDate: yesterday,
                departureTime: yesterday,
                availableSeats: 0,
                totalSeats: 4,
                fare: 1200,
                status: 'COMPLETED',
            }
        });
        console.log(`Created Completed Ride for Review Testing with ID: ${completedRide.id}`);

        // Create a completed booking for Test Passenger
        const completedBooking = await prisma.booking.create({
            data: {
                rideId: completedRide.id,
                passengerId: passengerUser.id,
                seatsBooked: 2,
                status: 'COMPLETED',
            }
        });
        console.log(`Created Completed Booking for Review Testing with ID: ${completedBooking.id}`);
    }

    // 8. Create Active Ride Requests (for Driver to browse)
    // Request from Test Passenger
    await prisma.rideRequest.create({
        data: {
            passengerId: passengerUser.id,
            from: 'Lahore',
            to: 'Islamabad',
            earliestDate: tomorrow,
            earliestTime: tomorrow,
            latestTime: tomorrow,
            seatsNeeded: 2,
            offerPerSeat: 1600,
            status: 'ACTIVE',
            expiresAt: tomorrow,
        }
    });
    console.log(`Created Active Ride Request for: ${passengerUser.name}`);

    // Request from Another Passenger
    await prisma.rideRequest.create({
        data: {
            passengerId: passengerUser2.id,
            from: 'Lahore',
            to: 'Islamabad',
            earliestDate: tomorrow,
            earliestTime: tomorrow,
            latestTime: tomorrow,
            seatsNeeded: 1,
            offerPerSeat: 1400,
            status: 'ACTIVE',
            expiresAt: tomorrow,
        }
    });
    console.log(`Created Active Ride Request for: ${passengerUser2.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
