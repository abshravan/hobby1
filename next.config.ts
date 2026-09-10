import type { NextConfig } from "next";

// Hard stop: a production bundle must never be built with the persona login
// switched on. Failing the build is the one guard a misconfigured deploy cannot
// route around at runtime.
if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_LOGIN === "true") {
  throw new Error(
    "ENABLE_DEV_LOGIN is set for a production build. Dev login lets anyone sign in " +
      "as any seeded account — unset it before building.",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
