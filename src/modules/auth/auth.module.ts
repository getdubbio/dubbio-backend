import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { AUTH, auth } from "./auth.js";
import { HttpAdapterHost } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";

@Global() // to be avaliable for every module using auth without importing
@Module({
  providers: [
    AuthService,
    // registering the auth value
    {
      provide: AUTH,
      useValue: auth,
    },
  ],
  controllers: [],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  onModuleInit() {
    this.httpAdapterHost.httpAdapter
      .getInstance()
      .all("/api/auth/*splat", toNodeHandler(auth));
  }
}
