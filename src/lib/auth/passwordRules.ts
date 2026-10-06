export const MIN_PASSWORD_LENGTH = 8;

export function checkNewPassword(newPassword: string, confirmPassword: string): string | null {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (newPassword !== confirmPassword) {
        return "Passwords do not match";
    }

    return null;
}