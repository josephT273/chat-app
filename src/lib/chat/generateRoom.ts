import { createHash } from "node:crypto";

export const generateRoomId = (userOne: string, userTwo: string): string => {
    const [a, b] = [userOne, userTwo].sort();
    return createHash("md5")
        .update(a! + b!)
        .digest("hex")
        .substring(0, 16)
        .toUpperCase();
};