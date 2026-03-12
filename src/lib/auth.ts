import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from 'better-auth/plugins';

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
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    advanced: {
        crossSubDomainCookies: {
            enabled: true
        }
    },
    cors: {
        origin: "*",
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    plugins: [openAPI()]
});
