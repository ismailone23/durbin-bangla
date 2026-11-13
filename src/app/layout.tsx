import type { Metadata, Viewport } from "next";
import { Anton, Hind_Siliguri, Manrope, Work_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const work = Work_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-work" });
const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind",
});

export const metadata: Metadata = {
  title: {
    default: "Durbin Bangla · Mohakhali",
    template: "%s · Durbin Bangla",
  },
  description:
    "Book a breakfast table, join the walk-in queue from your phone, or pre-order for pickup at Durbin Bangla, Mohakhali.",
};
export const viewport: Viewport = { themeColor: "#1c110d" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${hind.variable} ${anton.variable} ${work.variable}`}>
      <body className="min-h-dvh antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" theme="light" />
      </body>
    </html>
  );
}
