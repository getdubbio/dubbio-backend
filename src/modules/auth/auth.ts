import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { env } from "../../config/env.js";
import { db } from "../../database/db.js";
import {
  accountTable,
  sessionTable,
  userTable,
  verificationTable,
} from "../../database/schema/auth.schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
    },
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // TODO: use an email service for sending emails in production
        if (env.NODE_ENV == "development") {
          if (type === "sign-in") {
            console.log(`OTP for ${email} of type ${type}: ${otp}`);
            return;
          }
        }
      },
    }),
  ],
});

export type Auth = typeof auth;
export const AUTH = Symbol("AUTH"); // inject token
