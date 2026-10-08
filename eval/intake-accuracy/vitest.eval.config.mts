// Separate from the app's vitest config on purpose: these files are *.eval.ts, which `npm test` never picks
// up, because the runner makes real, billed API calls.
import { defineConfig } from "vitest/config";
import "dotenv/config";

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        include: ["eval/intake-accuracy/**/*.eval.ts"],
        testTimeout: 6 * 60 * 60 * 1000,
        hookTimeout: 10 * 60 * 1000,
    },
});
