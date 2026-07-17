export default function LeadFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
