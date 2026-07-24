# OneDev Project State

## Tổng quan
- Dự án: OneDev - All-in-One Developer Platform
- Đường dẫn: OneDev/ (workspace)
- Git: 3 commits trên branch main, chưa push (cần tạo GitHub repo)
- Tech: Next.js 15 + React 19 + TypeScript + TailwindCSS 4 + Prisma + SQLite
- Port: 3100
- Stats: 52 files, ~5242 dòng code

## Thứ tự ưu tiên (theo roadmap)
1. ✅ Converter Hub - 9 API routes + UI hoàn chỉnh
2. ✅ Link Shortener - API CRUD + Stats + UI hoàn chỉnh
3. 📋 File Transfer - Chưa bắt đầu
4. 🚧 Cloud Manager - Components đã có, FileBrowser đang port (subagent chạy)
5. 📋 Website Monitor - Chưa bắt đầu
6. 📋 VPS Dashboard - Chưa bắt đầu
7. ✅ Temp Mail - API + UI cơ bản (cần test thực tế với upstream APIs)
8. 📋 API Hub - Chưa bắt đầu
9. 📋 Telegram Bot Builder - Chưa bắt đầu
10. 📋 Prompt Marketplace - Chưa bắt đầu

## Git Commits
1. `54a3a46` - Initial project structure + Converter Hub + Link Shortener API + Cloud components
2. `450fac3` - Temp Mail module (provider abstraction + API + UI)
3. `e7444c0` - Link Shortener UI (CreateLinkForm + LinkTable)

## Cấu trúc đã tạo
- src/app/layout.tsx, page.tsx, globals.css (dark theme)
- src/components/Sidebar.tsx, TopBar.tsx, PlaceholderPage.tsx
- src/lib/utils.ts, db.ts, shortener.ts
- src/lib/tempmail/ (base, hangout, twob4d, index, types)
- src/lib/rclone-api.ts, cloud-types.ts, converter-tools.ts
- src/app/converter/ (page + ConverterTool component)
- src/app/api/converter/ (9 routes)
- src/app/api/shortener/ (3 routes)
- src/app/api/tempmail/ (4 routes)
- src/app/shortener/ (page + 2 components)
- src/app/tempmail/ (page)
- src/components/cloud/ (5 components - thiếu FileBrowser)
- prisma/schema.prisma

## Cần làm tiếp
- [ ] Tạo GitHub repo qkhalk/OneDev và push
- [ ] Cloud Manager: hoàn thiện FileBrowser + page chính
- [ ] File Transfer (Module #3)
- [ ] Website Monitor (Module #5)
- [ ] VPS Dashboard (Module #6)
- [ ] API Hub, Bot Builder, Prompt Market
- [ ] Install deps + test build

## Nguồn lực
- rclone-webui (Svelte): /home/khanh/rclone-webui/webui/
- Temp mail APIs: 2b4d.org, mail.hangout.io.vn
- VPS: 103.252.94.62
- SSH key: /home/khanh/.ssh-backup/id_ed25519
