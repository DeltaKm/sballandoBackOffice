import "~/styles/globals.css";
import { type Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Sballando Backoffice",
  description: "Backoffice per la gestione eventi Sballando",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#212939',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#FC0045',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
