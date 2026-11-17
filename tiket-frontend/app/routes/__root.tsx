import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ConfirmModal";
import "@/app/globals.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tiket" },
      {
        name: "description",
        content:
          "Create events, register guests and manage tickets with Tiket.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" className="antialiased font-sans">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col">
        <Outlet />
        <Scripts />
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--color-soft-bg)",
              backdropFilter: "blur(var(--blur-md))",
              WebkitBackdropFilter: "blur(var(--blur-md))",
              border: "none",
            },
            classNames: {
              success: "!bg-green-600 !text-white",
              error: "!bg-red-600 !text-white",
              warning: "!bg-yellow-500 !text-black",
              info: "!bg-[var(--bg-opacity-80)] !text-white",
            },
          }}
        />
        <ConfirmProvider />
      </body>
    </html>
  );
}
