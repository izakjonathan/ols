import type { Metadata } from "next";
import OlandServiceApp from "./components/OlandServiceApp";

export const metadata: Metadata = {
  title: "Øland Service",
  applicationName: "Øland Service",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Øland Service",
    statusBarStyle: "black-translucent",
  },
};

export default function Home() {
  return <OlandServiceApp mode="frontend" />;
}
