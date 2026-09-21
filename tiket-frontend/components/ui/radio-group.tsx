"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-white/20 text-white shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center text-current"
      >
        <CircleIcon className="size-2 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
