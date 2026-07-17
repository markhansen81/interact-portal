export default function LeadFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#3a3a3a] text-white">
        {children}
      </body>
    </html>
  );
}
