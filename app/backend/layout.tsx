import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Øland Service Backend",
  applicationName: "Øland Service Backend",
  manifest: "/backend.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ØS Backend",
    statusBarStyle: "black-translucent",
  },
};

export default function BackendLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
