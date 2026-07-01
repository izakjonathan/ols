import type { Metadata } from "next";
import OlandServiceApp from "./components/OlandServiceApp";

export const metadata: Metadata = {
  title: "Ølands Service",
  applicationName: "Ølands Service",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ølands Service",
    statusBarStyle: "black-translucent",
  },
};

export default function Home() {
  return <OlandServiceApp mode="frontend" />;
}
