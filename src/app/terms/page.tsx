import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = { title: "Terms of Service — Colliq" };

export default function TermsPage() {
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
          <h1 className="text-4xl font-black tracking-tight mb-3" style={{ color: "var(--text-foreground)" }}>Terms of Service</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Effective date: July 1, 2026 · Last updated: July 27, 2026</p>
        </div>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By accessing or using Colliq ("the Service"), operated by Zynotrix, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These Terms apply to all users, including workspace owners, administrators, and members.`,
          },
          {
            title: "2. The Service",
            body: `Colliq provides project management, team collaboration, and AI-assisted productivity tools. We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice. We may also introduce new features, impose limits, or restrict access at our discretion.`,
          },
          {
            title: "3. Account Registration",
            body: `You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately at support@zynotrix.com of any unauthorized access.\n\nYou must be at least 16 years old to use the Service.`,
          },
          {
            title: "4. Free and Paid Plans",
            body: `Colliq offers a free tier with usage limits and paid Pro plans with expanded capabilities. Paid plans are billed in advance on a monthly or annual basis. Fees are non-refundable except where required by law. We may change pricing with 30 days' notice.`,
          },
          {
            title: "5. Acceptable Use",
            body: `You agree NOT to:\n• Use the Service for any unlawful purpose.\n• Upload malware, spam, or harmful content.\n• Attempt to gain unauthorized access to any system.\n• Resell or redistribute the Service without written permission.\n• Reverse-engineer or extract source code from the Service.\n\nViolation may result in immediate account termination.`,
          },
          {
            title: "6. Your Content",
            body: `You retain ownership of all content you create in Colliq. By uploading content, you grant Zynotrix a limited license to store, process, and display it solely to provide the Service. We do not claim intellectual property rights over your content.`,
          },
          {
            title: "7. Intellectual Property",
            body: `All rights, title, and interest in the Service — including its software, design, and trademarks — belong exclusively to Zynotrix. Nothing in these Terms transfers any intellectual property rights to you.`,
          },
          {
            title: "8. Limitation of Liability",
            body: `To the maximum extent permitted by law, Zynotrix shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim shall not exceed the fees you paid us in the 12 months preceding the claim.`,
          },
          {
            title: "9. Indemnification",
            body: `You agree to defend, indemnify, and hold harmless Zynotrix and its officers, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.`,
          },
          {
            title: "10. Termination",
            body: `You may cancel your account at any time from the account settings. We may suspend or terminate your account for breach of these Terms. Upon termination, your right to use the Service ceases immediately. You may request a data export within 30 days before termination.`,
          },
          {
            title: "11. Governing Law",
            body: `These Terms are governed by the laws of the jurisdiction in which Zynotrix is incorporated, without regard to conflict of law principles. Disputes shall be resolved through binding arbitration, unless prohibited by applicable law.`,
          },
          {
            title: "12. Changes to Terms",
            body: `We may update these Terms at any time. Material changes will be communicated via email or in-app notice at least 14 days before they take effect. Continued use of the Service constitutes acceptance of the revised Terms.`,
          },
          {
            title: "13. Contact",
            body: `For questions about these Terms:\n\nZynotrix · legal@zynotrix.com`,
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
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/login" className="hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
