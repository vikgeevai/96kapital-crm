import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";

/**
 * Scoped deliberately narrowly.
 *
 * This repo had no linting at all. Rather than adopt a large rule set and
 * spend the next week on style churn, this enables the two categories that
 * every real bug in the recent sweep fell into:
 *
 *   no-floating-promises / no-misused-promises — the WhatsApp notification
 *   was fire-and-forget in a serverless function, so the lambda could be torn
 *   down before the request left. Nothing failed; the message just never
 *   arrived.
 *
 *   no-empty (including empty catch) — `catch {}` is how a Resend rejection,
 *   a 401 on the dashboard and a failed sidebar fetch all produced a
 *   confident-looking UI and no signal anywhere.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "next-env.d.ts",
      "eslint.config.mjs",
    ],
  },
  js.configs.recommended,
  ...next,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // The two that matter here, as errors.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],

      // recommendedTypeChecked brings a lot of stylistic opinion with it. Off,
      // so the signal above is not buried — not because they are wrong.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Off with a reason, not by accident:
      //
      // require-await fires on every `export async function OPTIONS()` route
      // handler. Next's handler signature is conventionally async whether or
      // not a given one awaits, and making them sync to satisfy a linter would
      // be following the tool rather than the framework.
      "@typescript-eslint/require-await": "off",
      // set-state-in-effect fires on `useEffect(() => { void fetchX(); }, [])`,
      // the standard load-on-mount shape used by every page here. It is a
      // render-performance rule from the React-compiler era, not a correctness
      // one, and reworking data loading across the dashboard is not what this
      // change is for.
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
