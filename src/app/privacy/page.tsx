import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = { title: "Privacy Policy — Colliq" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-foreground)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-[16px] font-black tracking-tight" style={{ color: "var(--text-foreground)" }}>COLLIQ</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
          Sign In
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Legal</p>
          <h1 className="text-4xl font-black tracking-tight mb-3" style={{ color: "var(--text-foreground)" }}>Privacy Policy</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Effective date: July 1, 2026 · Last updated: July 27, 2026</p>
        </div>

        {[
          {
            title: "1. Who We Are",
            body: `Colliq is a project management and AI work operating system built by Zynotrix. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use Colliq ("the Service"). By using Colliq, you agree to the practices described here.`,
          },
          {
            title: "2. Information We Collect",
            body: `Account information: name, email address, and password (stored as a secure hash) when you register.\n\nUsage data: pages visited, features used, timestamps, and interaction logs to improve the Service.\n\nContent data: tasks, projects, documents, messages, and other content you create within the Service.\n\nDevice and log data: IP address, browser type, operating system, and referral URLs for security and debugging.\n\nThird-party data: if you connect a Google account, we receive your name, email, and profile picture from Google.`,
          },
          {
            title: "3. How We Use Your Information",
            body: `To provide, operate, and improve the Service.\nTo authenticate your identity and maintain account security.\nTo send transactional emails (password resets, invitations, notifications).\nTo analyze usage patterns and fix bugs.\nTo comply with legal obligations.\n\nWe do not sell your personal data to third parties.`,
          },
          {
            title: "4. Data Sharing",
            body: `We share data only with:\n\n• Service providers who help us operate (e.g., database hosting, email delivery via Resend, analytics).\n• Your organisation's other members — project, task, and chat data is visible to members of your workspace.\n• Law enforcement when required by law or to protect rights and safety.`,
          },
          {
            title: "5. Data Retention",
            body: `We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting support. Anonymised aggregate data may be retained indefinitely for analytics.`,
          },
          {
            title: "6. Security",
            body: `We use industry-standard measures including TLS encryption in transit, bcrypt password hashing, and role-based access control. No system is 100% secure; please use a strong unique password and report any suspected breaches immediately.`,
          },
          {
            title: "7. Your Rights",
            body: `Depending on your location, you may have rights to access, correct, delete, or export your personal data. To exercise these rights, contact us at privacy@zynotrix.com. We respond within 30 days.`,
          },
          {
            title: "8. Cookies",
            body: `We use essential session cookies to keep you logged in. We do not use advertising or cross-site tracking cookies.`,
          },
          {
            title: "9. Changes to This Policy",
            body: `We may update this policy periodically. Material changes will be notified by email or an in-app banner at least 14 days in advance. Continued use of the Service after changes constitutes acceptance.`,
          },
          {
            title: "10. Contact",
            body: `Questions about this policy? Reach us at:\n\nZynotrix · privacy@zynotrix.com`,
          },
        ].map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-foreground)" }}>{section.title}</h2>
            <div className="text-[15px] leading-relaxed space-y-2" style={{ color: "var(--text-muted)" }}>
              {section.body.split("\n").map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>
          </section>
        ))}

        <div className="pt-8 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>© 2026 Zynotrix. All rights reserved.</p>
          <div className="flex gap-4 text-sm" style={{ color: "var(--accent)" }}>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/login" className="hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
