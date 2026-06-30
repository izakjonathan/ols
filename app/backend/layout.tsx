import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ølands Service Backend",
  applicationName: "Ølands Service Backend",
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
