"use client";

import { useState } from "react";

export default function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" onClick={copy} className={className}>
      {state === "done" ? "복사했어요" : state === "fail" ? "길게 눌러 직접 복사해 주세요" : "링크 복사"}
    </button>
  );
}
