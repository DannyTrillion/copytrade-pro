"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#" },
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
    <footer className="border-t border-white/[0.04]" style={{ background: "#040406" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#0D71FF] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">CopyTrade Pro</span>
            </Link>
            <p className="text-xs text-white/35 leading-relaxed max-w-xs">
              Professional copy trading platform powered by Webull infrastructure. Automate your trading strategy.
            </p>
          </div>

          {footerLinks.map((section, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link href={link.href} className="text-xs text-white/35 hover:text-[#0D71FF] transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} CopyTrade Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Discord", "Twitter", "GitHub"].map((social) => (
              <a key={social} href="#" className="text-xs text-white/30 hover:text-[#0D71FF] transition-colors duration-200">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
