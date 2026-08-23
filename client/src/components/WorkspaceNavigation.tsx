import React from "react";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WorkspaceCrumb = { label: string; onClick?: () => void };

export function WorkspaceBreadcrumbs({ items }: { items: WorkspaceCrumb[] }) {
  return <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-400">{items.map((item, index) => <React.Fragment key={`${item.label}-${index}`}>{index > 0 && <ChevronRight size={14} aria-hidden="true"/>}{item.onClick ? <button type="button" className="rounded px-1 py-0.5 text-cyan-200 underline-offset-2 hover:text-cyan-100 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-300" onClick={item.onClick}>{index === 0 && <Home className="mr-1 inline" size={13}/>} {item.label}</button> : <span className="px-1 text-slate-200" aria-current="page">{item.label}</span>}</React.Fragment>)}</nav>;
}

export function MobileStickyActions({ primary, secondary }: { primary: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }; secondary?: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean } }) {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary?.icon;
  return <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cyan-400/25 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(2,6,23,0.45)] backdrop-blur md:hidden"><div className="mx-auto flex max-w-lg gap-2">{secondary && SecondaryIcon && <Button variant="outline" className="min-h-11 flex-1 bg-slate-900/80" disabled={secondary.disabled} onClick={secondary.onClick}><SecondaryIcon size={16}/>{secondary.label}</Button>}<Button className="blueprint-button min-h-11 flex-1" disabled={primary.disabled} onClick={primary.onClick}><PrimaryIcon size={16}/>{primary.label}</Button></div></div>;
}
