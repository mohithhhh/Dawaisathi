import Link from "next/link";

export const metadata = {
  title: "Medical Disclaimer — DawaiSathi",
};

export default function DisclaimerPage() {
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
        <span className="text-xs" style={{ color: "#a8bec9" }}>Medical Disclaimer</span>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Medical Disclaimer</h1>
        <p className="text-sm mb-8" style={{ color: "#a8bec9" }}>Last updated: March 2025</p>

        {/* Emergency notice */}
        <div
          className="rounded-xl p-4 mb-8"
          style={{ background: "rgba(251,226,167,0.08)", border: "1px solid rgba(251,226,167,0.2)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#fbe2a7" }}>
            🚨 In case of a medical emergency, call <strong>112</strong> immediately.
          </p>
          <p className="text-xs mt-1" style={{ color: "#a8bec9" }}>
            Do not rely on this app in an emergency. Call emergency services or go to the nearest hospital.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "#c8d8e4" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>AI-Generated Content</h2>
            <p className="mb-3">Explanations provided by DawaiSathi are <strong style={{ color: "#fbe2a7" }}>generated automatically by artificial intelligence (AI)</strong> and may contain errors, inaccuracies, incomplete information, or outdated data.</p>
            <p>AI systems can make mistakes. The information provided should be treated as a starting point for understanding your medicine, not as authoritative medical guidance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>Always Verify with a Professional</h2>
            <p className="mb-3"><strong style={{ color: "#f0f8ff" }}>Always verify medicine information with a licensed pharmacist or doctor</strong> before:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Starting, stopping, or changing dosage of any medication</li>
              <li>Combining medicines (drug interactions)</li>
              <li>Taking medicine during pregnancy, breastfeeding, or for children</li>
              <li>Taking medicine with existing health conditions</li>
              <li>Any situation where you are unsure about your medication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>Not Medical Advice</h2>
            <p>DawaiSathi does not provide medical advice, diagnosis, or treatment. The Service is an <strong style={{ color: "#f0f8ff" }}>educational tool</strong> designed to help patients understand medicine information in their native language.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>Individual Variation</h2>
            <p>Medical information can vary significantly between individuals based on age, weight, existing conditions, other medications, allergies, and other factors. Generic medicine information cannot account for your specific situation.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>No Doctor-Patient Relationship</h2>
            <p>Use of DawaiSathi does not create a doctor-patient, pharmacist-patient, or any other healthcare provider-patient relationship. The pharmacist callback feature connects you with a third-party pharmacist; DawaiSathi is not responsible for advice given in those conversations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>Limitation of Liability</h2>
            <p>DawaiSathi, its operators, and contributors expressly disclaim all liability for any adverse health outcomes, injuries, or damages arising from reliance on information provided through this Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#f0f8ff" }}>Contact</h2>
            <p>If you have concerns about this disclaimer: <a href="mailto:team@dawaisathi.in" style={{ color: "#fbe2a7" }}>team@dawaisathi.in</a></p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-6 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs space-x-4" style={{ color: "#4a6a7a" }}>
          <Link href="/privacy" className="hover:opacity-80 transition-opacity">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:opacity-80 transition-opacity">Terms</Link>
          <span>·</span>
          <Link href="/disclaimer" className="hover:opacity-80 transition-opacity" style={{ color: "#fbe2a7" }}>Disclaimer</Link>
        </p>
      </footer>
    </div>
  );
}
