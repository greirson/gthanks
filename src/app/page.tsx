'use client';

import Link from 'next/link';
import { Gift, Users, Lock, Heart, Github, Shield, Code } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center px-3 py-8 sm:p-6 lg:p-8">
      {/* Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[1080px] mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Main Card - Offset to Left on Desktop */}
        <div className="lg:col-start-2 lg:col-span-6 xl:col-start-2 xl:col-span-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 xl:p-12 border border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">gthanks</h1>
            </div>

            <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed">
              Share wish lists with friends and family.
            </p>

            {/* Feature Grid - Horizontal on mobile, 2 columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Feature 1 */}
              <div className="flex flex-row sm:flex-col items-start gap-3 sm:gap-0">
                <div className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center sm:mb-3">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-0.5 sm:mb-1">
                    Family Groups
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                    Coordinate with loved ones
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-row sm:flex-col items-start gap-3 sm:gap-0">
                <div className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center sm:mb-3">
                  <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-0.5 sm:mb-1">
                    Private Lists
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                    Control who sees what
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-row sm:flex-col items-start gap-3 sm:gap-0">
                <div className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center sm:mb-3">
                  <Gift className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-0.5 sm:mb-1">
                    Gift Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                    Never duplicate again
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-row sm:flex-col items-start gap-3 sm:gap-0">
                <div className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center sm:mb-3">
                  <Heart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-0.5 sm:mb-1">
                    Easy Sharing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                    One-click invites
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/login"
                className="flex-1 bg-blue-600 dark:bg-blue-500 text-white text-center font-semibold py-3.5 px-6 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors min-h-[44px] flex items-center justify-center"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="flex-1 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-center font-semibold py-3.5 px-6 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] flex items-center justify-center"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Badge Pills */}
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm">
              <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Open Source</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Secure</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Family Friendly</span>
            </div>
          </div>

          {/* GitHub Link */}
          <div className="mt-3 sm:mt-4 text-center sm:text-left">
            <Link
              href="https://github.com/greirson/gthanks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="underline decoration-slate-400 dark:decoration-gray-600 underline-offset-4">
                View on GitHub
              </span>
            </Link>
          </div>
        </div>

        {/* Right Side Accent - Blue Gradient Block (Hidden on Mobile) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-5">
          <div className="relative">
            {/* Decorative Blue Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl opacity-10 blur-3xl transform -translate-x-8 translate-y-8"></div>

            {/* Feature Highlights */}
            <div className="relative space-y-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      Coordinate with Family
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Create groups and share lists with everyone at once
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900 transform translate-x-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      Hidden Reservations
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Reserve gifts without spoiling the surprise
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
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
