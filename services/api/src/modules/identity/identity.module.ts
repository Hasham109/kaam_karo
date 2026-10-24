/**
 * M1 Identity & Access Module (ARCH §4 M1; BP §8, §25, §27, §29; D-002).
 * Provides authentication (phone OTP, admin MFA), session management, and staff RBAC lookup.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { STAFF_ROLE_LOOKUP } from '../catalog';
import {
  ADMIN_MFA_CHALLENGE_STORE,
  AUTH_PEPPER,
  OTP_CHALLENGE_STORE,
  OTP_SENDER,
} from './identity.constants';
import { FakeOtpSender } from './otp/otp-sender.interface';
import { MemoryOtpChallengeStore } from './otp/otp-challenge.store';
import { MemoryAdminMfaChallengeStore } from './admin/admin-auth.service';
import { OtpService } from './otp/otp.service';
import { SessionService } from './session/session.service';
import { AdminAuthService } from './admin/admin-auth.service';
import { AnonymizerService } from './anonymizer/anonymizer.service';
import { DatabaseStaffRoleLookup } from './staff-role-lookup';
import { AuthGuard } from './guards/auth.guard';
import { RequireAdminSubRoleGuard, RequireRoleGuard } from './guards/require-role.guard';
import { AuthController } from './controllers/auth.controller';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
    SessionService,
    OtpService,
    AdminAuthService,
    AnonymizerService,
    DatabaseStaffRoleLookup,
    AuthGuard,
    RequireRoleGuard,
    RequireAdminSubRoleGuard,
    { provide: STAFF_ROLE_LOOKUP, useExisting: DatabaseStaffRoleLookup },
    { provide: OTP_SENDER, useClass: FakeOtpSender },
    { provide: OTP_CHALLENGE_STORE, useClass: MemoryOtpChallengeStore },
    { provide: ADMIN_MFA_CHALLENGE_STORE, useClass: MemoryAdminMfaChallengeStore },
    {
      provide: AUTH_PEPPER,
      useFactory: () => process.env['AUTH_PEPPER'] ?? 'kaamkaro-dev-auth-pepper-secret-32b',
    },
  ],
  exports: [
    SessionService,
    OtpService,
    AdminAuthService,
    AnonymizerService,
    DatabaseStaffRoleLookup,
    AuthGuard,
    RequireRoleGuard,
    RequireAdminSubRoleGuard,
    STAFF_ROLE_LOOKUP,
    OTP_SENDER,
    OTP_CHALLENGE_STORE,
  ],
})
export class IdentityModule {}
