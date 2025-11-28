import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";


export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "use-sync-external-store",
      "use-sync-external-store/shim/index.js",
      // UI libs
      "lucide-react",
      "@radix-ui/react-slot",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "@radix-ui/react-separator",
      "@radix-ui/react-avatar",
      "@radix-ui/react-popover",
      "@radix-ui/react-accordion",
      "@radix-ui/react-menubar",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      // Query and utils
      "@tanstack/react-query",
      "@tanstack/query-core",
      "qrcode.react",
      "class-variance-authority",
      "tailwind-merge",
      "clsx"
    ]
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        // Workspace root (monorepo root)
        path.resolve(import.meta.dirname),
        // Client source root
        path.resolve(import.meta.dirname, "client"),
        // Allow node_modules for /@fs access when root=client
        path.resolve(import.meta.dirname, "node_modules"),
      ],
    },
  },
});
