import type { Metadata } from "next";
import OlandServiceApp from "../components/OlandServiceApp";

export const metadata: Metadata = {
  title: "Øland Service Admin",
  applicationName: "Øland Service Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ØS Admin",
    statusBarStyle: "black-translucent",
  },
};

export default function Page() {
  return <OlandServiceApp mode="backend" />;
}
