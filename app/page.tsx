"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-8 overflow-hidden bg-bg">
      {/* Immersive Background Gradients */}
      <div className="absolute inset-0 bg-mesh-primary opacity-60 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/90" />
      
      {/* Decorative Orbs */}
      <motion.div 
        animate={{ y: [0, -20, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl"
      />
      <motion.div 
        animate={{ y: [0, 20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl"
      />

      <div className="relative z-10 w-full max-w-2xl text-center space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-primary bg-surface border border-primary/20 mb-4 shadow-sm">
            <span className="flex w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
            Institutional Grade System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-ink leading-tight">
            The Future of <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover drop-shadow-sm">
              Attendance
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-lg mx-auto leading-relaxed mt-6">
            A seamless, lightning-fast digital register designed to eliminate manual roll-call and save valuable classroom time.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/login" passHref>
            <Button size="lg" className="w-full sm:w-auto min-w-[200px] shadow-lg shadow-primary/20">
              Login
            </Button>
          </Link>
          <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[200px] bg-surface border border-border hover:bg-surface-hover">
            View Live Screen
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
