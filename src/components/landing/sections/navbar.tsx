"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "For Traders", href: "#traders" },
  { label: "Security", href: "#security" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      // Stay dark through hero, video, and globe sections
      const globeSection = document.getElementById("global-reach");
      const videoSection = document.getElementById("video-showcase");
      const darkEnd = globeSection
        ? globeSection.offsetTop + globeSection.offsetHeight
        : videoSection
          ? videoSection.offsetTop + videoSection.offsetHeight
          : window.innerHeight;
      setPastHero(window.scrollY > darkEnd - 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLight = pastHero;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? isLight
            ? "bg-white/90 backdrop-blur-2xl border-b border-[#E0E3EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : "bg-[#0B0E17]/80 backdrop-blur-2xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-6 h-[64px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0">
          {isLight ? (
            <Image src="/logo-dark.svg" alt="CopyTrade Pro" width={160} height={28} className="h-6 w-auto" />
          ) : (
            <Image src="/logo-light.svg" alt="CopyTrade Pro" width={160} height={28} className="h-6 w-auto" />
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                isLight
                  ? "text-[#131722]/60 hover:text-[#131722] hover:bg-[#F0F3FA]"
                  : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
              isLight
                ? "text-[#131722]/70 hover:text-[#131722] hover:bg-[#F0F3FA]"
                : "text-white/70 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-[14px] font-semibold bg-brand hover:bg-brand-dark text-white rounded-[20px] transition-all duration-200 hover:shadow-glow"
          >
            Get started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            isLight ? "text-[#131722]/60 hover:bg-[#F0F3FA]" : "text-white/60 hover:bg-white/[0.06]"
          }`}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`lg:hidden overflow-hidden border-t ${
              isLight
                ? "bg-white/95 backdrop-blur-2xl border-[#E0E3EB]"
                : "bg-[#0B0E17]/95 backdrop-blur-2xl border-white/[0.06]"
            }`}
          >
            <div className="px-6 py-5 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 text-[15px] font-medium rounded-lg transition-colors ${
                    isLight
                      ? "text-[#131722]/60 hover:text-[#131722] hover:bg-[#F0F3FA]"
                      : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className={`pt-4 mt-3 border-t flex flex-col gap-2 ${isLight ? "border-[#E0E3EB]" : "border-white/[0.06]"}`}>
                <Link href="/login" className={`px-4 py-3 text-[15px] font-medium rounded-lg ${isLight ? "text-[#131722]/70" : "text-white/70"}`}>
                  Sign in
                </Link>
                <Link href="/signup" className="px-5 py-3 text-[15px] font-semibold bg-brand text-white rounded-[20px] text-center">
                  Get started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
