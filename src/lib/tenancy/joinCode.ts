import { randomInt } from "crypto";

// No I, L, O, 0, or 1, so a code read aloud or copied by hand can't be misread.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 8;

export function generateJoinCode(): string {
	let code = "";

	for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
		code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
	}

	return code;
}