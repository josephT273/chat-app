import CryptoJS from "crypto-js";
import md5 from "crypto-js/md5";

export const generateKey = (userId: string, date: Date): string => {
    return md5(userId + date.getTime().toString())
        .toString()
        .substring(0, 8)
        .toUpperCase();
};

export const encryptMessage = (text: string, key: string, iv: string): string => {
    const keyWA = CryptoJS.enc.Utf8.parse(key);
    const ivWA = CryptoJS.enc.Utf8.parse(iv);
    const encrypted = CryptoJS.DES.encrypt(text, keyWA, {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
};

export const decryptMessage = (hex: string, key: string, iv: string): string => {
    try {
        const keyWA = CryptoJS.enc.Utf8.parse(key);
        const ivWA = CryptoJS.enc.Utf8.parse(iv);
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Hex.parse(hex),
        });
        const decrypted = CryptoJS.DES.decrypt(cipherParams, keyWA, {
            iv: ivWA,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        return decrypted.toString(CryptoJS.enc.Utf8) || "[encrypted]";
    } catch {
        return "[encrypted]";
    }
};