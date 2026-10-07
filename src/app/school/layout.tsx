export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="border-t-3 border-teal-500 border-b border-b-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              IA
            </div>
            <span className="text-lg font-semibold text-zinc-900">
              InterACT English
            </span>
          </div>
          <span className="text-sm text-teal-600 font-medium">School Portal</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-teal-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-zinc-500">
          <p>InterACT English gGmbH | Planufer 92B, 10967 Berlin</p>
          <p className="mt-1">
            <a href="mailto:info@interactenglish.de" className="hover:text-zinc-700">
              info@interactenglish.de
            </a>
            {" | "}
            <a
              href="https://interactenglish.de"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-700"
            >
              interactenglish.de
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
