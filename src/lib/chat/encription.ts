import crypto from "node:crypto";

class ChatAppEncryption {
    private encryptionAlgorithm = "des-cbc";
    private secretEncryptionKey: Buffer;
    private initializationVector: Buffer;

    constructor(key: string, iv: string) {
        this.secretEncryptionKey = Buffer.from(key);
        this.initializationVector = Buffer.from(iv);

        if (this.secretEncryptionKey.length !== 8) {
            throw new Error("DES key must be 8 bytes");
        }

        if (this.initializationVector.length !== 8) {
            throw new Error("DES IV must be 8 bytes");
        }
    }

    encryptMessage(message: string): string {
        const cipher = crypto.createCipheriv(
            this.encryptionAlgorithm,
            this.secretEncryptionKey,
            this.initializationVector
        );

        let encrypted = cipher.update(message, "utf8", "hex");
        encrypted += cipher.final("hex");

        return encrypted;
    }

    decryptMessage(encryptedMessage: string): string {
        const decipher = crypto.createDecipheriv(
            this.encryptionAlgorithm,
            this.secretEncryptionKey,
            this.initializationVector
        );

        let decrypted = decipher.update(encryptedMessage, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    }
}

export default ChatAppEncryption