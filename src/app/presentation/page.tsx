export const metadata = { title: "InterACT Portal — Team Meeting 4 Nov 2026" };

export default function PresentationPage() {
  return (
    <iframe
      src="/presentation/index.html"
      className="fixed inset-0 w-full h-full border-0"
      style={{ display: "block" }}
    />
  );
}
