export default function VersionPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Ølands Service v8</h1>
      <p>Employee hour-control module added.</p>
      <p>Admin can create employees, copy employee links, review tasks, and remove hours from totals.</p>
      <p>Employee pages live at /employee/[token] and do not expose backend access.</p>
      <p>EventOS deployment settings and Supabase support active.</p>
    </main>
  );
}
