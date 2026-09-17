import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Continua Tabs — pick up where you left off",
  description: "Your desktop tabs, on your phone. Send pages to your browser.",
  manifest: "/manifest-mobile.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Continua Tabs" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/m-sw.js').catch(function(){})})}`,
        }}
      />
    </>
  );
}
