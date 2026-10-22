/**
 * Makes the validated server env (SEC-BASE-011) injectable everywhere via SERVER_ENV.
 * Business rules do not live here: they come from the ConfigRule store (A03, T2.6).
 */
import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { ServerEnv } from '@kaamkaro/platform';

export const SERVER_ENV = Symbol('SERVER_ENV');

@Global()
@Module({})
export class ServerEnvModule {
  static forRoot(env: ServerEnv): DynamicModule {
    return {
      module: ServerEnvModule,
      providers: [{ provide: SERVER_ENV, useValue: env }],
      exports: [SERVER_ENV],
    };
  }
}
