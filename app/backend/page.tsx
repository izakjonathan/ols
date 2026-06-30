import type { Metadata } from "next";
import NordicAutoCareApp from "../components/NordicAutoCareApp";

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

export default function BackendPage() {
  return <NordicAutoCareApp mode="backend" />;
}
