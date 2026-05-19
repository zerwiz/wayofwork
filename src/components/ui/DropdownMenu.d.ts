// DropdownMenu.d.ts
// Simplified type declarations for dropdown menu components

import * as React from "react";

export function DropdownMenu(
  props: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode },
): React.JSX.Element;

export function DropdownMenuTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link"
      | undefined;
    size?: "default" | "sm" | "lg" | "icon" | undefined;
  },
): React.JSX.Element;

export function DropdownMenuContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "center" | "end" | undefined;
    sideOffset?: number | undefined;
    alignOffset?: number | undefined;
  },
): React.JSX.Element;

export function DropdownMenuItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    inset?: boolean | undefined;
    disabled?: boolean | undefined;
  },
): React.JSX.Element;

export function DropdownMenuSeparator(
  props: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive" | undefined;
  },
): React.JSX.Element;

export function DropdownMenuLabel(
  props: React.HTMLAttributes<HTMLDivElement>,
): React.JSX.Element;

export function DropdownMenuCheckboxItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean | undefined;
    indeterminate?: boolean | undefined;
  },
): React.JSX.Element;

export function DropdownMenuRadioItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
  },
): React.JSX.Element;

export function DropdownMenuSub(
  props: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode },
): React.JSX.Element;

export function DropdownMenuSubTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    inset?: boolean | undefined;
    asChild?: boolean | undefined;
  },
): React.JSX.Element;

export function DropdownMenuSubContent(
  props: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode },
): React.JSX.Element;

export function DropdownMenuArrow(
  props: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive" | undefined;
  },
): React.JSX.Element;

export function DropdownMenuPortal(
  props: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode },
): React.JSX.Element;

export function DropdownMenuGroup(
  props: React.HTMLAttributes<HTMLDivElement>,
): React.JSX.Element;
