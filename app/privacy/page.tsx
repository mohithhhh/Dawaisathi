import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — DawaiSathi",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0d1c24", color: "#f0f8ff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: "#0d1c24", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/" className="font-semibold text-sm hover:opacity-80 transition-opacity">
          ← DawaiSathi
        </Link>
        <span className="text-xs" style={{ color: "#a8bec9" }}>Privacy Policy</span>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: "#a8bec9" }}>Last updated: March 2025</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "#c8d8e4" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>1. What Data We Collect</h2>
            <p className="mb-3">When you use DawaiSathi, we collect the following information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong style={{ color: "#f0f8ff" }}>Google Account Email &amp; Name</strong> — collected when you sign in with Google for authentication purposes.</li>
              <li><strong style={{ color: "#f0f8ff" }}>Medicine Search History</strong> — the medicine names you search and the language you select are stored to provide the "My History" feature.</li>
              <li><strong style={{ color: "#f0f8ff" }}>Payment Records</strong> — if you make a payment, we store the order ID, payment type, and amount via Razorpay. We do not store card numbers or UPI IDs.</li>
              <li><strong style={{ color: "#f0f8ff" }}>Usage Metadata</strong> — number of medicine explanations used, subscription status, and account creation date.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>2. How Your Data Is Stored</h2>
            <p>All data is stored securely in <strong style={{ color: "#f0f8ff" }}>Supabase</strong>, which hosts its database infrastructure in the <strong style={{ color: "#f0f8ff" }}>Mumbai, India region (ap-south-1)</strong>. Your data stays within India and is protected by Supabase&apos;s security standards including encryption at rest and in transit.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To authenticate you and maintain your session.</li>
              <li>To provide the medicine explanation service and personalized history.</li>
              <li>To process payments and maintain your subscription status.</li>
              <li>To improve the service (aggregate, anonymized usage patterns only).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>4. Data Sharing</h2>
            <p className="mb-3"><strong style={{ color: "#f0f8ff" }}>We do not sell your personal data to third parties.</strong> Data is only shared with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong style={{ color: "#f0f8ff" }}>Google</strong> — for authentication (OAuth 2.0). Governed by Google&apos;s Privacy Policy.</li>
              <li><strong style={{ color: "#f0f8ff" }}>Razorpay</strong> — for processing payments. Governed by Razorpay&apos;s Privacy Policy.</li>
              <li><strong style={{ color: "#f0f8ff" }}>Google (Gemini API)</strong> — medicine names are sent to the Gemini API to generate explanations. No personally identifying information is sent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>5. Data Retention &amp; Deletion</h2>
            <p>You may request deletion of your account and all associated data by emailing us. We will process deletion requests within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>6. Governing Law</h2>
            <p>This Privacy Policy is governed by the <strong style={{ color: "#f0f8ff" }}>Information Technology Act, 2000</strong> and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 of India.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>7. Contact</h2>
            <p>For privacy-related queries or data deletion requests, contact us at: <a href="mailto:team@dawaisathi.in" style={{ color: "#fbe2a7" }}>team@dawaisathi.in</a></p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-6 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs space-x-4" style={{ color: "#4a6a7a" }}>
          <Link href="/privacy" className="hover:text-accent transition-colors" style={{ color: "#fbe2a7" }}>Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:opacity-80 transition-opacity">Terms</Link>
          <span>·</span>
          <Link href="/disclaimer" className="hover:opacity-80 transition-opacity">Disclaimer</Link>
        </p>
      </footer>
    </div>
  );
}
