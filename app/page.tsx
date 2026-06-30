import type { Metadata } from "next";
import NordicAutoCareApp from "./components/NordicAutoCareApp";

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
  return <NordicAutoCareApp mode="frontend" />;
}
