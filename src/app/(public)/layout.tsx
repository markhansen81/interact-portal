import "@/app/globals.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" style={{ backgroundColor: "#333333" }}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Epilogue:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen text-white antialiased" style={{ fontFamily: "'Epilogue', sans-serif", backgroundColor: "#333333" }}>
        {children}
      </body>
    </html>
  );
}
