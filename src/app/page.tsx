'use client';

import Link from 'next/link';
import { Gift, Users, Lock, Heart, Github, Shield, Code } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-3 py-8 dark:from-gray-900 dark:via-slate-900 dark:to-blue-950 sm:p-6 lg:p-8">
      {/* Theme Switcher */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Main Card - Offset to Left on Desktop */}
        <div className="lg:col-span-6 lg:col-start-2 xl:col-span-5 xl:col-start-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:p-8 lg:p-10 xl:p-12">
            <div className="mb-4 flex items-center gap-3 sm:mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 dark:bg-blue-500">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                gthanks
              </h1>
            </div>

            <p className="mb-6 text-base leading-relaxed text-slate-600 dark:text-gray-300 sm:mb-8 sm:text-lg lg:text-xl">
              Share wish lists with friends and family.
            </p>

            {/* Feature Grid - Horizontal on mobile, 2 columns on larger screens */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-6">
              {/* Feature 1 */}
              <div className="flex flex-row items-start gap-3 sm:flex-col sm:gap-0">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 sm:mb-3">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-900 dark:text-white sm:mb-1 sm:text-base">
                    Family Groups
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-400 sm:text-sm">
                    Coordinate with loved ones
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-row items-start gap-3 sm:flex-col sm:gap-0">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 sm:mb-3">
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-900 dark:text-white sm:mb-1 sm:text-base">
                    Private Lists
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-400 sm:text-sm">
                    Control who sees what
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-row items-start gap-3 sm:flex-col sm:gap-0">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 sm:mb-3">
                  <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-900 dark:text-white sm:mb-1 sm:text-base">
                    Gift Tracking
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-400 sm:text-sm">
                    Never duplicate again
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-row items-start gap-3 sm:flex-col sm:gap-0">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 sm:mb-3">
                  <Heart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-900 dark:text-white sm:mb-1 sm:text-base">
                    Easy Sharing
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-400 sm:text-sm">
                    One-click invites
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-slate-100 px-6 py-3.5 text-center font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Badge Pills */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6 sm:justify-start sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-4">
              <Code className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 sm:h-4 sm:w-4" />
              <span className="text-xs font-medium text-slate-700 dark:text-gray-300 sm:text-sm">
                Open Source
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-4">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 sm:h-4 sm:w-4" />
              <span className="text-xs font-medium text-slate-700 dark:text-gray-300 sm:text-sm">
                Secure
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-4">
              <Heart className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 sm:h-4 sm:w-4" />
              <span className="text-xs font-medium text-slate-700 dark:text-gray-300 sm:text-sm">
                Family Friendly
              </span>
            </div>
          </div>

          {/* GitHub Link */}
          <div className="mt-3 text-center sm:mt-4 sm:text-left">
            <Link
              href="https://github.com/greirson/gthanks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <Github className="h-4 w-4" />
              <span className="underline decoration-slate-400 underline-offset-4 dark:decoration-gray-600">
                View on GitHub
              </span>
            </Link>
          </div>
        </div>

        {/* Right Side Accent - Blue Gradient Block (Hidden on Mobile) */}
        <div className="hidden lg:col-span-4 lg:block xl:col-span-5">
          <div className="relative">
            {/* Decorative Blue Accent */}
            <div className="absolute inset-0 -translate-x-8 translate-y-8 transform rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 opacity-10 blur-3xl"></div>

            {/* Feature Highlights */}
            <div className="relative space-y-6">
              <div className="rounded-2xl border border-blue-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-blue-900 dark:bg-gray-800/80">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-slate-900 dark:text-white">
                      Coordinate with Family
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Create groups and share lists with everyone at once
                    </p>
                  </div>
                </div>
              </div>

              <div className="translate-x-8 transform rounded-2xl border border-blue-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-blue-900 dark:bg-gray-800/80">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-slate-900 dark:text-white">
                      Hidden Reservations
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Reserve gifts without spoiling the surprise
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-blue-900 dark:bg-gray-800/80">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-slate-900 dark:text-white">
                      Priority Guidance
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Star your most-wanted items to help gift givers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
