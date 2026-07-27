import "./globals.css";
import "./platform.css";
import "./home.css";
import Navbar from "../components/Navbar";
import AuthBridge from "../components/AuthBridge";

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
      <body>
        <AuthBridge />
        <Navbar />
        {children}
      
      </body>
    </html>
  );
}
