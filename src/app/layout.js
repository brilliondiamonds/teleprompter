import Script from "next/script";

export const metadata = {
  title: "Teleprompter | Agency Prompt Factory",
  description: "Dynamic AI Image Prompt Engineering for Professional Studios.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/appwrite.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:opsz,wght@14..32,100..900&family=Poppins:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://js.puter.com/v2/"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

