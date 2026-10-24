import type { ClientSurface } from '../../../../generated/prisma/client.js';

export interface SendOtpDto {
  phone: string;
  surface: ClientSurface;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
  surface: ClientSurface;
  deviceLabel?: string;
  pushToken?: string;
}

export interface AdminLoginDto {
  phone: string;
}

export interface AdminMfaVerifyDto {
  challengeId: string;
  code: string;
}
