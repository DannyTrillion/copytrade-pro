"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Testimonials", href: "#testimonials" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#06060a]/85 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.03)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo — Webull */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/webull-logo.svg"
            alt="Webull"
            width={100}
            height={20}
            className="h-5 w-auto brightness-0 invert opacity-90"
            priority
          />
          <div className="w-px h-4 bg-white/10" />
          <span className="text-white/50 text-xs font-medium tracking-wide">CopyTrade</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}
              className="px-3.5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 text-white/35 hover:text-white/70 hover:bg-white/[0.03]"
            >{link.label}</a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2.5">
          <Link href="/login" className="px-4 py-2 text-[13px] font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.04] rounded-lg transition-all duration-200">
            Log in
          </Link>
          <Link href="/signup" className="px-5 py-2 text-[13px] font-semibold bg-[#0D71FF] hover:bg-[#0B63E0] text-white rounded-full transition-all duration-200 hover:shadow-[0_2px_12px_rgba(13,113,255,0.25)] active:scale-[0.97]">
            Get started
          </Link>
        </div>

        {/* Mobile */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-white/40 hover:bg-white/[0.04]">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden bg-[#06060a]/95 backdrop-blur-xl border-t border-white/[0.03]"
          >
            <div className="px-6 py-4 space-y-0.5">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium rounded-lg text-white/35 hover:text-white hover:bg-white/[0.03]"
                >{link.label}</a>
              ))}
              <div className="pt-3 mt-2 border-t border-white/[0.03] flex flex-col gap-2">
                <Link href="/login" className="px-4 py-2.5 text-sm text-white/40">Log in</Link>
                <Link href="/signup" className="px-5 py-2.5 text-sm font-semibold bg-[#0D71FF] text-white rounded-full text-center">Get started</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
