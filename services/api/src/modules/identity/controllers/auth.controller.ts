/**
 * Authentication and Session endpoints (contracts/identity.yaml v0.1.0; BP §8, §27;
 * SEC-AUTH-001..008, ADMIN-ROLE-001).
 */
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import type { HttpRequest } from '../../../platform/http-types';
import { AuthGuard, Public } from '../guards/auth.guard';
import { OtpService } from '../otp/otp.service';
import { SessionService } from '../session/session.service';
import { AdminAuthService } from '../admin/admin-auth.service';
import { AnonymizerService } from '../anonymizer/anonymizer.service';
import type { AdminLoginDto, AdminMfaVerifyDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { Idempotent } from '../../../platform/idempotency.interceptor';

@Controller('v1/auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
    private readonly adminAuthService: AdminAuthService,
    private readonly anonymizerService: AnonymizerService,
  ) {}

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    if (!body?.phone || !body?.surface) {
      throw AppError.of('BAD_REQUEST');
    }
    return this.otpService.sendOtp(body.phone, body.surface);
  }

  @Public()
  @Post('otp/verify')
  @Idempotent('auth.otp.verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    if (!body?.phone || !body?.code || !body?.surface) {
      throw AppError.of('BAD_REQUEST');
    }
    return this.otpService.verifyOtp({
      phoneRaw: body.phone,
      code: body.code,
      surface: body.surface,
      ...(body.deviceLabel ? { deviceLabel: body.deviceLabel } : {}),
      ...(body.pushToken ? { pushToken: body.pushToken } : {}),
    });
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() body: AdminLoginDto) {
    if (!body?.phone) {
      throw AppError.of('BAD_REQUEST');
    }
    return this.adminAuthService.initiateLogin(body.phone);
  }

  @Public()
  @Post('admin/mfa/verify')
  @HttpCode(HttpStatus.OK)
  async adminMfaVerify(@Body() body: AdminMfaVerifyDto) {
    if (!body?.challengeId || !body?.code) {
      throw AppError.of('BAD_REQUEST');
    }
    return this.adminAuthService.verifyMfa(body.challengeId, body.code);
  }

  @Post('session/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshSession(@Req() req: HttpRequest) {
    const user = req.user;
    if (!user || typeof user['sessionId'] !== 'string') throw AppError.of('UNAUTHENTICATED');
    const refreshed = await this.sessionService.refreshSession(user['sessionId'] as string);
    return {
      token: refreshed.rawToken,
      expiresAt: refreshed.expiresAt.toISOString(),
    };
  }

  @Post('session/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Req() req: HttpRequest) {
    const user = req.user;
    if (!user || typeof user['sessionId'] !== 'string') throw AppError.of('UNAUTHENTICATED');
    await this.sessionService.revokeSession(user['sessionId'] as string);
  }

  @Post('session/revoke-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllSessions(@Req() req: HttpRequest) {
    const user = req.user;
    if (!user || typeof user.id !== 'string') throw AppError.of('UNAUTHENTICATED');
    await this.sessionService.revokeAllSessions(user.id);
  }

  @Post('account/delete-request')
  @HttpCode(HttpStatus.OK)
  async requestAccountDeletion(@Req() req: HttpRequest) {
    const user = req.user;
    if (!user || typeof user.id !== 'string') throw AppError.of('UNAUTHENTICATED');
    return this.anonymizerService.requestDeletion(user.id);
  }
}
