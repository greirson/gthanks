'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Github, Code, Shield, Heart } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/utils';

const features = [
  'Family Groups',
  'Private Lists',
  'Gift Coordination',
  'Easy Sharing',
  'Hidden Reservations',
  'Star Priorities',
  'Magic Link Login',
  'Dark Mode',
  'Public Profiles',
  'Password Protection',
  'Custom URLs',
  'Image Upload',
  'Google Sign In',
  'Co-Admin Access',
  'Group Invites',
  'Bulk Actions',
];

interface PiledFeature {
  text: string;
  x: number;
  rotation: number;
  id: number;
}

export default function HomePage() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [speed, setSpeed] = useState(10); // 10s per loop = 3 loops in 30s
  const [phase, setPhase] = useState<'normal' | 'accelerating' | 'exploding' | 'piled'>('normal');
  const [flyingFeatures, setFlyingFeatures] = useState<string[]>([]);
  const [piledFeatures, setPiledFeatures] = useState<PiledFeature[]>([]);

  // Timer - counts up every second
  useEffect(() => {
    if (phase === 'piled') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Speed control based on elapsed time
  useEffect(() => {
    if (phase === 'exploding' || phase === 'piled') {
      return;
    }

    if (elapsedTime < 20) {
      // Normal speed for first 20 seconds (~2 full loops at 10s each)
      setSpeed(10);
      setPhase('normal');
    } else if (elapsedTime < 35) {
      // Accelerating from 20-35 seconds
      setPhase('accelerating');
      const progress = (elapsedTime - 20) / 15;
      // Exponential speedup: 10s -> 0.5s
      const newSpeed = 10 * Math.pow(0.05, progress);
      setSpeed(Math.max(0.5, newSpeed));
    } else if (elapsedTime >= 35) {
      // Explosion time!
      setPhase('exploding');
      triggerExplosion();
    }
  }, [elapsedTime, phase]);

  const triggerExplosion = useCallback(() => {
    // Launch each feature one by one
    features.forEach((feature, index) => {
      // Stagger the fly-out
      setTimeout(() => {
        setFlyingFeatures((prev) => [...prev, feature]);

        // After flying animation, add to pile
        setTimeout(() => {
          setPiledFeatures((prev) => [
            ...prev,
            {
              text: feature,
              x: Math.random() * 300 - 150, // random horizontal offset
              rotation: Math.random() * 40 - 20, // random tilt
              id: index,
            },
          ]);
        }, 600); // match fly-out animation duration
      }, index * 80); // stagger each feature by 80ms
    });

    // Set piled phase after all features are done
    setTimeout(
      () => {
        setPhase('piled');
      },
      features.length * 80 + 800
    );
  }, []);

  const resetAnimation = () => {
    setElapsedTime(0);
    setSpeed(15);
    setPhase('normal');
    setFlyingFeatures([]);
    setPiledFeatures([]);
  };

  // Calculate visual effects based on speed
  const isShaking = speed < 3;
  const isBlurry = speed < 1.5;
  const glowIntensity = speed < 8 ? (8 - speed) / 8 : 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#faf5f0] px-4 py-8 dark:bg-gray-900">
      {/* Theme Toggle */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="flex w-full max-w-md flex-col items-center">
        {/* Sticky Note: App Name */}
        <div className="mb-6 -rotate-2 transform cursor-default rounded-sm bg-gradient-to-br from-amber-100 to-amber-200 px-8 py-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:from-amber-200/90 dark:to-amber-300/90">
          <span className="flex items-center font-handwriting text-4xl text-amber-900 sm:text-5xl">
            <Image
              src="/logo-symbol.png"
              alt="g"
              width={48}
              height={48}
              className="mr-0.5 inline-block h-10 w-10 [filter:brightness(0)_sepia(1)_saturate(10)_hue-rotate(350deg)] sm:h-12 sm:w-12"
              sizes="(max-width: 640px) 40px, 48px"
              priority
            />
            thanks
          </span>
        </div>

        {/* Sticky Note: Tagline */}
        <div className="mb-8 rotate-1 transform cursor-default rounded-sm bg-gradient-to-br from-pink-100 to-pink-200 px-8 py-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:from-pink-200/90 dark:to-pink-300/90">
          <p className="font-handwriting text-2xl text-pink-900 sm:text-3xl">Keep wishes.</p>
          <p className="font-handwriting text-2xl text-pink-900 sm:text-3xl">Share joy.</p>
        </div>

        {/* CTA Buttons */}
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/login"
            className="min-h-[44px] min-w-[140px] rounded-full bg-blue-600 px-6 py-3 text-center font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="min-h-[44px] min-w-[140px] rounded-full border-2 border-gray-300 bg-white px-6 py-3 text-center font-medium text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Ticker */}
        {phase !== 'piled' && (
          <div
            className={cn(
              'relative mb-8 w-full overflow-hidden rounded-lg border border-gray-200 bg-white/80 py-3 shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800/80',
              isShaking && 'animate-shake',
              isBlurry && 'blur-[1px]'
            )}
            style={{
              boxShadow:
                glowIntensity > 0
                  ? `0 0 ${glowIntensity * 25}px rgba(239, 68, 68, ${glowIntensity * 0.6})`
                  : undefined,
            }}
          >
            <div
              className="flex whitespace-nowrap"
              style={{
                animation:
                  phase !== 'exploding' ? `ticker-scroll ${speed}s linear infinite` : 'none',
                width: 'fit-content',
                willChange: 'transform',
              }}
            >
              {/* Duplicate features for seamless loop */}
              {[...features, ...features].map((feature, index) => (
                <span
                  key={index}
                  className={cn(
                    'mx-4 inline-flex flex-shrink-0 items-center text-sm text-gray-600 transition-opacity dark:text-gray-300',
                    flyingFeatures.includes(feature) && index < features.length && 'opacity-0'
                  )}
                >
                  <span className="mr-2 text-blue-500">&#x2022;</span>
                  {feature}
                </span>
              ))}
            </div>

            {/* Flying features */}
            {flyingFeatures.map((feature, index) => (
              <span
                key={`flying-${index}`}
                className="absolute left-4 top-1/2 -translate-y-1/2 animate-fly-out text-sm text-gray-600 dark:text-gray-300"
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                <span className="mr-2 text-blue-500">&#x2022;</span>
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Code className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Open Source
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Secure</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Heart className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Family Friendly
            </span>
          </div>
        </div>

        {/* GitHub Link */}
        <Link
          href="https://github.com/greirson/gthanks"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Github className="h-4 w-4" />
          <span className="underline decoration-gray-300 underline-offset-4 dark:decoration-gray-600">
            View on GitHub
          </span>
        </Link>
      </main>

      {/* Piled Features at Bottom */}
      {piledFeatures.length > 0 && (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-40">
          {piledFeatures.map((f) => (
            <div
              key={f.id}
              className="absolute bottom-6 left-1/2 animate-land-bounce"
              style={
                {
                  '--rotation': `${f.rotation}deg`,
                  transform: `translateX(calc(-50% + ${f.x}px))`,
                } as React.CSSProperties
              }
            >
              <span className="whitespace-nowrap rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 shadow-md dark:bg-blue-900 dark:text-blue-200">
                {f.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Reset Button */}
      {phase === 'piled' && (
        <button
          onClick={resetAnimation}
          className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300"
        >
          That was fun! Reset
        </button>
      )}
    </div>
  );
}
