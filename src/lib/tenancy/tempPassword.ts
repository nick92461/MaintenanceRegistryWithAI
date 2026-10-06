import { randomInt } from "crypto";

//No I L O i l o 0 or 1 so a password read aloud or copied can't be misread
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const PASSWORD_LENGTH = 16;

export function generateTempPassword(): string {
    let password = "";

    for (let i = 0; i < PASSWORD_LENGTH; i++) {
        password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
    }

    return password;
}