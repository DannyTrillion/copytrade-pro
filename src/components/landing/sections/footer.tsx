"use client";

import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "For Traders", href: "#traders" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "API Docs", href: "#" },
      { label: "Webhook Setup", href: "#" },
      { label: "Polymarket SDK", href: "#" },
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
    <footer className="border-t border-white/[0.06]" style={{ background: "#060810" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-5">
              <Image src="/logo-light.svg" alt="CopyTrade Pro" width={140} height={24} className="h-5 w-auto" />
            </Link>
            <p className="text-xs text-white/50 leading-relaxed max-w-xs">
              Professional copy trading platform connecting TradingView signals with Polymarket execution.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((section, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link href={link.href} className="text-xs text-white/50 hover:text-brand transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} CopyTrade Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Discord", "Twitter", "GitHub"].map((social) => (
              <a key={social} href="#" className="text-xs text-white/50 hover:text-brand transition-colors duration-200">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
