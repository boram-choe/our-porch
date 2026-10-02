"use client";

import { useEffect } from "react";
import { captureAcquisition } from "@/lib/acquisition";

/** 모든 페이지 진입 시 유입 경로(?src=, 리퍼러)를 저장한다. 화면에는 아무것도 그리지 않는다. */
export default function AcquisitionTracker() {
  useEffect(() => {
    captureAcquisition();
  }, []);
  return null;
}
