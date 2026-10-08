import { createHash, timingSafeEqual } from "crypto";

const MIN_SECRET_LENGTH = 16;

function digest(value: string): Buffer {
    return createHash("sha256").update(value).digest();
}

export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
    if (!secret || secret.length < MIN_SECRET_LENGTH || !authorization) {
        return false;
    }

    return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}