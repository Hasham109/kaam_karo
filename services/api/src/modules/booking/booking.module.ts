/**
 * Booking Module (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1.
 */
import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';

@Module({
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
