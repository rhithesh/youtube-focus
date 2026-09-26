"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Honour the OS "reduce motion" setting across every animation on the page.
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
