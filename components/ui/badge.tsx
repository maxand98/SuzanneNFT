import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={twMerge("tag", className)} {...props} />;
}
