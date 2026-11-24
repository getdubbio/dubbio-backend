import { Injectable, Inject } from "@nestjs/common";
import { type Auth, AUTH } from "./auth.js";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}
  // getting the
  get api() {
    return this.auth.api;
  }
  // getting current session's record from db.
  async getSession(req: Request) {
    return this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  }
}
