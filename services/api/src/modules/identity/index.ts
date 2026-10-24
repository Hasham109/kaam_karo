/**
 * Module M1 identity — Identity & Access (ARCH §4 M1, BP §27; D-002).
 */
export * from './identity.constants';
export * from './identity.module';
export * from './otp/otp-sender.interface';
export * from './otp/otp-challenge.store';
export * from './otp/otp.service';
export * from './session/session.service';
export * from './admin/admin-auth.service';
export * from './anonymizer/anonymizer.service';
export * from './staff-role-lookup';
export * from './guards/auth.guard';
export * from './guards/require-role.guard';
export * from './controllers/auth.controller';
export * from './controllers/dto/auth.dto';
