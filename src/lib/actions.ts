"use server";

import type { User } from "better-auth";
import { z } from "zod";
import { authClient } from "./auth-client";

const SignUpSchema = z.object({
    email: z.email().trim().toLowerCase(),
    name: z.string(),
    password: z
        .string()
        .min(8, { message: "Be at least 8 characters long" })
        .trim(),
});

const SignInSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z
        .string()
        .min(8, { message: "Be at least 8 characters long" })
        .trim(),
});

export type SignUpActionState = {
    name?: string;
    email?: string;
    password?: string;
    user?: User | null;
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        general?: string;
    };
};

export type SignInActionState = {
    email?: string;
    password?: string;
    user?: User | null;
    errors?: {
        email?: string[];
        password?: string[];
        general?: string;
    };
};

export async function signUp(
    _prevState: SignUpActionState,
    form: FormData,
): Promise<SignUpActionState> {
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const validatedFields = SignUpSchema.safeParse({
        name,
        email,
        password,
    });

    if (!validatedFields.success) {
        return {
            name,
            email,
            password,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    try {
        const { data } = await authClient.signUp.email({
            email, password, callbackURL: "/", name
        });

        return { email, password, user: data?.user };
    } catch (e) {
        console.log(e)
        return {
            email,
            password,
            errors: { general: "Something went error email or password" },
        };
    }
}

export async function signIn(
    _prevState: SignInActionState,
    form: FormData,
): Promise<SignInActionState> {
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const validatedFields = SignInSchema.safeParse({
        email,
        password,
    });

    if (!validatedFields.success) {
        return {
            email,
            password,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const { data } = await authClient.signIn.email({
            email, password, callbackURL: "/",
        });

        return { email, password, user: data?.user };
    } catch (e) {
        console.log(e)
        return {
            email,
            password,
            errors: { general: "Invalid email or password" },
        };
    }
}
