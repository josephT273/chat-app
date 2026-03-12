import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// local library
import { db } from "@/lib/schema/connection";
import * as schema from "@/lib/schema/schema";
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["*"],
    advanced: {
        crossSubDomainCookies: { enabled: false },
        defaultCookieAttributes: {
            sameSite: "lax",
            secure: false,
            httpOnly: true,
            domain: undefined,
        },
    },
    cors: {
        origin: (origin: string[]) => origin,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
});
