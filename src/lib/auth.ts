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
    plugins: [openAPI()]
});
