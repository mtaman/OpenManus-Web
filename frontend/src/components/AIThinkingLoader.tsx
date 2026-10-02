'use client';

import React, { useState, useEffect, useRef } from 'react';
import NeuralLoaderV3, { LoaderColorInput } from './NeuralLoaderV3';

export type RawStatus =
  | string
  | {
      status?: string;
      message?: string;
      text?: string;
      label?: string;
      tool?: string;
      query?: string;
      [key: string]: unknown;
    };

export type TextAnimation = 'fade' | 'shimmer' | 'none';

interface AIThinkingLoaderProps {
  status?: RawStatus | null;
  message?: string | null;
  translations?: Record<string, string>;
  iconSize?: number;
  color?: LoaderColorInput;
  speed?: number;
  className?: string;
  /** Which animation to apply to the text */
  textAnimation?: TextAnimation;
  /** Show animated dots (...) after the text */
  showDots?: boolean;
}

function resolveStatusMessage(
  status: RawStatus | null | undefined,
  translations?: Record<string, string>
): string {
  if (status === null || status === undefined) return '';

  if (typeof status === 'string') {
    return translations?.[status] ?? status;
  }

  const key = status.status ?? status.message ?? status.text ?? status.label;

  if (typeof key === 'string') {
    if (translations?.[key]) return translations[key];

    const parts: string[] = [key];
    if (status.tool) parts.push(`(${status.tool})`);
    if (status.query) parts.push(`: ${status.query}`);
    return parts.join(' ');
  }

  try {
    return JSON.stringify(status);
  } catch {
    return '';
  }
}

const TEXT_ANIMATION_CLASS: Record<TextAnimation, string> = {
  fade: 'status-fade',
  shimmer: 'status-shimmer',
  none: '',
};

export default function AIThinkingLoader({
  status,
  message,
  translations,
  iconSize = 25,
  color = 'blue',
  speed = 5,
  className = '',
  textAnimation = 'shimmer',
  showDots = true,
}: AIThinkingLoaderProps) {
  const resolved = message ?? resolveStatusMessage(status, translations);

  // Re-mount the span to restart the animation on every text change
  const [animationKey, setAnimationKey] = useState(0);
  const prevMessage = useRef(resolved);

  useEffect(() => {
    if (prevMessage.current !== resolved) {
      setAnimationKey((k) => k + 1);
      prevMessage.current = resolved;
    }
  }, [resolved]);

  if (!resolved) return null;

  const animationClass = TEXT_ANIMATION_CLASS[textAnimation];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={resolved}
      className={`flex items-center gap-2.5 text-xs ${className}`}
    >
      <NeuralLoaderV3 size={iconSize} color={color} speed={speed} />

      <span className="inline-flex items-center font-medium">
        

        {showDots && (
          <span className="status-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </span>

      <span key={animationKey} className={animationClass}>
          {resolved}
        </span>
        
    </div>
  );
}