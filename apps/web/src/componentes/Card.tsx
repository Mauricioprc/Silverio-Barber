import { type HTMLAttributes } from "react";

export function Card({ className = "", ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded border border-base-700 bg-base-900 p-6 shadow-sm ${className}`} {...resto} />;
}
