import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPassengerDto } from './dto/register-passenger.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP (mock for now, real WhatsApp later)
  async sendOtp(dto: SendOtpDto) {
    const { phone } = dto;

    // Generate OTP
    const code = this.generateOtp();
    const expirationMinutes =
      this.configService.get<number>('otp.expirationMinutes') || 10;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Delete old OTP codes for this phone
    await this.prisma.otpCode.deleteMany({
      where: { phone },
    });

    // Save new OTP
    await this.prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // TODO: Send OTP via WhatsApp
    // For now, just return it (ONLY FOR DEVELOPMENT!)
    console.log(` OTP for ${phone}: ${code}`);

    return {
      message: 'OTP sent successfully',
      // Remove this in production:
      otp: code, // Only for testing!
    };
  }

  // Verify OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, code } = dto;

    // Find OTP
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Mark as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return {
      message: 'OTP verified successfully',
      verified: true,
    };
  }

  // Register Passenger
  async registerPassenger(dto: RegisterPassengerDto) {
    const { phone, name, cnic, city, district, country, profileImage } = dto;

    // Check if phone already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Check if OTP was verified
    const verifiedOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verifiedOtp) {
      throw new BadRequestException('Please verify your phone number first');
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        phone,
        name,
        cnic,
        city,
        district,
        country,
        profileImage,
        role: 'PASSENGER',
      },
    });

    // Link OTP to user
    await this.prisma.otpCode.update({
      where: { id: verifiedOtp.id },
      data: { userId: user.id },
    });

    // Generate JWT token
    const token = this.generateToken(user.id, user.role);

    return {
      message: 'Passenger registered successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city,
        district: user.district,
        country: user.country,
      },
      token,
    };
  }

  // Register Driver
  async registerDriver(dto: RegisterDriverDto) {
    const {
      phone,
      name,
      cnic,
      carName,
      carColor,
      licenseNumber,
      carType,
      numberOfSeats,
      carNumberPlate,
      profession,
      organization,
    } = dto;

    // Check if phone already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Check if OTP was verified
    const verifiedOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verifiedOtp) {
      throw new BadRequestException('Please verify your phone number first');
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        phone,
        name,
        cnic,
        role: 'DRIVER',
      },
    });

    // Create driver profile
    await this.prisma.driver.create({
      data: {
        userId: user.id,
        name,
        phone,
        cnic,
        carName,
        carColor,
        licenseNumber,
        carType,
        numberOfSeats,
        carNumberPlate,
        profession,
        organization,
      },
    });

    // Link OTP to user
    await this.prisma.otpCode.update({
      where: { id: verifiedOtp.id },
      data: { userId: user.id },
    });

    // Generate JWT token
    const token = this.generateToken(user.id, user.role);

    return {
      message: 'Driver registered successfully. Awaiting admin verification.',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  // Login
  async login(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        driver: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if OTP was verified
    const verifiedOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verifiedOtp) {
      throw new BadRequestException('Please verify your phone number first');
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.role);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        ...(user.role === user.role && {
          verificationStatus: user.driver?.verificationStatus,
        }),
      },
      token,
    };
  }

  // Generate JWT Token
  private generateToken(userId: number, role: string) {
    const payload = { sub: userId, role };
    return this.jwtService.sign(payload);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      cnic: user.cnic,
      role: user.role,
      city: user.city,
      district: user.district,
      country: user.country,
      profileImage: user.profileImage,
      rating: user.rating,
      createdAt: user.createdAt,
      ...(user.driver && {
        driver: {
          carName: user.driver.carName,
          carColor: user.driver.carColor,
          carType: user.driver.carType,
          numberOfSeats: user.driver.numberOfSeats,
          carNumberPlate: user.driver.carNumberPlate,
          verificationStatus: user.driver.verificationStatus,
        },
      }),
    };
  }
}
