/**
 * ChatModule — NestJS module for Communication & Chat (owner A10, T7.2).
 * Requirements: CHAT-001, CHAT-002, CHAT-003, CHAT-004, SHARE-001..003.
 * ARCH §4 M13; BP §20, §25, §74, §82; D-009, D-011.
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { PlatformModule } from '../../platform/index.js';
import { CALL_RELAY_SERVICE } from './call-relay/call-relay.interface.js';
import { FakeCallRelayService } from './call-relay/fake-call-relay.service.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [IdentityModule, PlatformModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: CALL_RELAY_SERVICE,
      useClass: FakeCallRelayService,
    },
    FakeCallRelayService,
  ],
  exports: [ChatService, CALL_RELAY_SERVICE, FakeCallRelayService],
})
export class ChatModule {}
