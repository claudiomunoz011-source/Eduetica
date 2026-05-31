import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import ThemeWrapper from "@/components/ThemeWrapper";

export const metadata: Metadata = {
  title: "EduÉtica — Aprende Ética de Forma Lúdica",
  description:
    "Plataforma educativa gamificada de ética para estudiantes de 8 a 18 años. Explora dilemas éticos, compite con tus compañeros y aprende valores fundamentales.",
  keywords: ["ética", "educación", "gamificación", "dilemas", "valores"],
  authors: [{ name: "EduÉtica Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeWrapper>{children}</ThemeWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
