import { APP_NAME } from "./legal";
export function LegalBody({ doc }) {
  return (
    <>
      {doc.body.map((s) => (
        <section key={s.h} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 6px" }}>{s.h}</h2>
          {s.p.map((t, i) => <p key={i} style={{ margin: "0 0 8px", lineHeight: 1.55, fontSize: ".9375rem" }}>{t}</p>)}
        </section>
      ))}
    </>
  );
}
export function LegalPage({ doc, Head }) {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px", color: "var(--text-primary)" }}>
      <Head><title>{doc.title} | {APP_NAME}</title></Head>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 20px" }}>{doc.title}</h1>
      <LegalBody doc={doc} />
      <p style={{ marginTop: 28 }}><a href="/" style={{ color: "var(--accent)" }}>Back to {APP_NAME}</a></p>
    </main>
  );
}
