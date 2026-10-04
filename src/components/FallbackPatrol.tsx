"use client";

import { useState } from "react";
import PatrolPanel from "./PatrolPanel";

/** 네이버부동산 매물 후보가 없을 때만 쓰는 예비 경로 (중개업소·거리 순회). 기본으로는 접어 둔다. */
export default function FallbackPatrol() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left px-5 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-sm font-black text-slate-700">
        {open ? "▾" : "▸"} 예비 경로: 구역 순회 <span className="text-[11px] font-bold text-slate-400">(매물 후보가 없을 때만 사용)</span>
      </button>
      {open && <PatrolPanel />}
    </div>
  );
}