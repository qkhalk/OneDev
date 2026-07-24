# OneDev Project State

## Tổng quan
- Dự án: OneDev - All-in-One Developer Platform
 Đường dẫn: OneDev/
- Tech: Next.js 15 + React 19 + TypeScript + TailwindCSS 4 + Prisma + SQLite
- Port: 3100

## Thứ tự ưu tiên (theo roadmap)
1. ✅ Converter Hub - Đang xây dựng (subagents đang chạy)
2. 🚧 Link Shortener - Subagent đang chạy
3. 📋 File Transfer
4. 🚧 Cloud Manager - Subagent đang chạy (port từ rclone-webui)
5. 📋 Website Monitor
6. 📋 VPS Dashboard
7. 📋 Temp Mail - Subagent đang chạy
8. 📋 API Hub
9. 📋 Telegram Bot Builder
10. 📋 Prompt Marketplace

## Subagents đang chạy (2026-07-24)
- converter-hub-backend: 9 API routes
- converter-hub-ui: UI + components
- cloud-manager-port: rclone-webui → Next.js
- link-shortener-module: Full module + Prisma
- temp-mail-module: Temp mail integration

## Cấu trúc đã tạo
- src/app/layout.tsx, page.tsx, globals.css
- src/components/Sidebar.tsx, TopBar.tsx, PlaceholderPage.tsx
- src/lib/utils.ts, db.ts
- Placeholder pages cho tất cả 10 modules
- package.json, tsconfig.json, next.config.ts, postcss.config.mjs

## Nguồn lực
- rclone-webui (Svelte): /home/khanh/rclone-webui/webui/
- Temp mail APIs: 2b4d.org, mail.hangout.io.vn
- VPS: 103.252.94.62
