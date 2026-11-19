import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MainContentWrapper } from "@/components/layout/MainContentWrapper";
import { ThemeInitializer } from "@/components/shared/ThemeInitializer";
import { AISelectionAssistant } from "@/components/shared/AISelectionAssistant";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export const metadata: Metadata = {
  title: "MedSetup",
  description: "Plataforma de Estudos Médicos com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Nunito:wght@400;600;700;800;900&family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    var stored = localStorage.getItem('medsetup_app_storage') || localStorage.getItem('studyflow_app_storage');
                    if (stored) {
                      var parsed = JSON.parse(stored);
                      if (parsed && parsed.state && parsed.state.theme) {
                        theme = parsed.state.theme;
                      }
                    }
                  }
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else if (theme === 'system') {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.classList.remove('light');
                    } else {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.classList.add('light');
                    }
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} flex h-dvh max-h-dvh overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#0f1117] dark:text-gray-100 transition-colors duration-150`}
      >
        <ThemeInitializer />
        <AISelectionAssistant />
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative">
          <Header />
          <MainContentWrapper>
            {children}
          </MainContentWrapper>
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
