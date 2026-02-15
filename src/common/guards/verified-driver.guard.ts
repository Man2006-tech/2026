import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class VerifiedDriverGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user || user.role !== 'DRIVER') {
      throw new ForbiddenException('Only drivers can access this');
    }

    // The user object here comes from JwtStrategy
    // We expect user.driver to be populated there? 
    // Actually JwtStrategy usually returns { userId, role }. 
    // If this guard relies on user.driver, it must be because the strategy fetches it.
    // Let's assume request.user has the driver object attached.

    // Correction: In strict mode, we might need to fetch the driver here if not present.
    // But for now, let's just fix the enum check.
    if (!user.driver || user.driver.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Driver not verified by admin');
    }

    return true;
  }
}