import type { Metadata } from "next";
import OlandServiceApp from "../components/OlandServiceApp";

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

export default function Page() {
  return <OlandServiceApp mode="backend" />;
}
