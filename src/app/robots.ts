import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/cookies", "/login", "/signup"],
        disallow: ["/teams/", "/account", "/api/", "/join", "/claim/", "/reset-password/", "/verify-email/"],
      },
    ],
  };
}
