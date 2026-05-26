/**
 * Standard full-page shell used by every inner-app route.
 * Provides the white card layout centred on a slate background.
 */
export default function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto bg-white shadow-2xl min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
