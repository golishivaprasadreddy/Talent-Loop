import "./globals.css";
import "./platform.css";
import "./home.css";

export const metadata = {
  title: "TalentLoop | Find work worth doing",
  description: "A modern jobs board connecting ambitious people with meaningful work.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
