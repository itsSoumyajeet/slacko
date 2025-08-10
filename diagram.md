```
slackco/
├── .dockerignore
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── scheduler.js
├── server.ts
├── tailwind.config.ts
├── tsconfig.json
├── .next/
├── db/
│   └── custom.db
├── examples/
│   └── websocket/
│       └── page.tsx
├── node_modules/
├── prisma/
│   ├── dev.db
│   └── schema.prisma
├── public/
│   ├── logo.svg
│   └── robots.txt
└── src/
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── api/
    │   │   ├── debug/
    │   │   │   └── env/
    │   │   │       └── route.ts
    │   │   ├── health/
    │   │   │   └── route.ts
    │   │   └── slack/
    │   │       ├── auth/
    │   │       │   └── route.ts
    │   │       ├── callback/
    │   │       │   └── route.ts
    │   │       ├── channels/
    │   │       │   └── route.ts
    │   │       ├── messages/
    │   │       │   └── route.ts
    │   │       ├── scheduler/
    │   │       │   └── route.ts
    │   │       ├── tokens/
    │   │       │   └── route.ts
    │   │       └── workspaces/
    │   │           └── route.ts
    │   └── debug/
    │       └── oauth/
    │           └── route.ts
    ├── components/
    │   └── ui/
    │       ├── accordion.tsx
    │       ├── alert-dialog.tsx
    │       ├── alert.tsx
    │       ├── aspect-ratio.tsx
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── carousel.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── collapsible.tsx
    │       ├── command.tsx
    │       ├── context-menu.tsx
    │       ├── dialog.tsx
    │       ├── drawer.tsx
    │       ├── dropdown-menu.tsx
    │       ├── form.tsx
    │       ├── hover-card.tsx
    │       ├── input-otp.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── menubar.tsx
    │       ├── navigation-menu.tsx
    │       ├── pagination.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── resizable.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── slider.tsx
    │       ├── sonner.tsx
    │       ├── switch.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toast.tsx
    │       ├── toaster.tsx
    │       ├── toggle-group.tsx
    │       ├── toggle.tsx
    │       └── tooltip.tsx
    ├── hooks/
    │   ├── use-mobile.ts
    │   └── use-toast.ts
    └── lib/
        ├── db.ts
        ├── socket.ts
        └── utils.ts
```