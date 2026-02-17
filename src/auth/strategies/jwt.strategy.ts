import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('JwtStrategy Validate Payload:', payload);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { driver: true },
    });

    if (!user) {
      console.log('JwtStrategy: User not found for ID', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    console.log('JwtStrategy: User found', user.id);
    return user;
  }
}
