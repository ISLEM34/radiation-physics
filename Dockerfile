# ── البناء ──
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx next typegen && npm run build

# ── التشغيل ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# drizzle-kit يحتاج ملف المخطط عند إنشاء الجداول داخل الحاوية
COPY --from=build /app/src ./src
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
# ينشئ الجداول أولًا (مصادر، حسابات، محفوظات) ثم يشغّل الخادم
CMD ["sh", "-c", "npx drizzle-kit push && npm run start"]
