/**
 * QuotesModule — Quotes & Fare Module definition (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10; BP §18, §53, §58; D-004, D-015, D-018.
 */
import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller.js';
import { QuotesService } from './quotes.service.js';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
