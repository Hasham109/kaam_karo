/**
 * Root module of the background worker process (T2.2; REL-009; BP §31.2; D-001 BullMQ).
 * Consumer modules (e.g. A10 notifications in T7.1) are added to `imports` and register their
 * consumer with OutboxConsumerRegistry in `onModuleInit`.
 */
import { type DynamicModule, Module } from '@nestjs/common';
import type { ServerEnv } from '@kaamkaro/platform';
import { ServerEnvModule } from './config/server-env.module';
import { PlatformModule } from './platform';
import { OutboxRelayService } from './platform/outbox-relay.service';
import { PrismaOutboxRelayStore } from './platform/outbox-relay.store';

@Module({})
export class WorkerModule {
  static forRoot(env: ServerEnv): DynamicModule {
    return {
      module: WorkerModule,
      imports: [ServerEnvModule.forRoot(env), PlatformModule],
      providers: [PrismaOutboxRelayStore, OutboxRelayService],
    };
  }
}
