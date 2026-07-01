import type { Metadata } from "next";
import OlandServiceApp from "../components/OlandServiceApp";

export const metadata: Metadata = {
  title: "Ølands Service Admin",
  applicationName: "Ølands Service Admin",
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
