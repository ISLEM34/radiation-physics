import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // نضمن أن حزمة pg (والتي تتصل بالقاعدة) تُبقى خارج الحزمة وتُحمَّل من node_modules
  serverExternalPackages: ["pg"],
};

export default nextConfig;
