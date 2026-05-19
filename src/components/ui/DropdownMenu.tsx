import * as React from "react";

/** Simplified DropdownMenu component */
function DropdownMenu(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuTrigger */
function DropdownMenuTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean },
) {
  return <button {...props} />;
}

/** Simplified DropdownMenuContent */
function DropdownMenuContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "center" | "end";
  },
) {
  return <div {...props} />;
}

/** Simplified DropdownMenuItem */
function DropdownMenuItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return <button {...props} />;
}

/** Simplified DropdownMenuSeparator */
function DropdownMenuSeparator(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuLabel */
function DropdownMenuLabel(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuCheckboxItem */
function DropdownMenuCheckboxItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean },
) {
  return <button {...props} />;
}

/** Simplified DropdownMenuRadioItem */
function DropdownMenuRadioItem(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string },
) {
  return <button {...props} />;
}

/** Simplified DropdownMenuSub */
function DropdownMenuSub(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuSubTrigger */
function DropdownMenuSubTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return <button {...props} />;
}

/** Simplified DropdownMenuSubContent */
function DropdownMenuSubContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuArrow */
function DropdownMenuArrow(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuGroup */
function DropdownMenuGroup(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

/** Simplified DropdownMenuPortal */
function DropdownMenuPortal(
  props: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode },
) {
  return <>{props.children}</>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuArrow,
  DropdownMenuGroup,
  DropdownMenuPortal,
};

export default DropdownMenu;
