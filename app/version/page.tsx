export default function VersionPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Øland Service v48</h1>
      <p style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.5 }}>Temporary final test build.</p>
      <ul style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.7, paddingLeft: 20 }}>
        <li>Feature set frozen for testing.</li>
        <li>Frontend, backend and employee link included.</li>
        <li>Supabase/localStorage fallback included.</li>
        <li>Build tested successfully.</li>
      </ul>
    </main>
  );
}
