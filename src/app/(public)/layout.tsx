import "@/app/globals.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#3a3a3a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
