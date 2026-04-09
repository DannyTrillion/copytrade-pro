"use client";

import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Testimonials", href: "#testimonials" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "API Docs", href: "#" },
      { label: "Webull Setup", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Register", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Risk Disclosure", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]" style={{ background: "#040406" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 md:mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-5">
              <Image src="/webull-logo.svg" alt="Webull" width={80} height={16} className="h-4 w-auto brightness-0 invert opacity-60" />
            </Link>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs">
              Professional copy trading powered by Webull infrastructure. Automate your strategy.
            </p>
          </div>

          {footerLinks.map((section, i) => (
            <div key={i}>
              <h4 className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link href={link.href} className="text-[13px] text-white/35 hover:text-white/70 transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/25">
            &copy; {new Date().getFullYear()} CopyTradesPro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Discord", "Twitter", "GitHub"].map((social) => (
              <a key={social} href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors duration-200">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
