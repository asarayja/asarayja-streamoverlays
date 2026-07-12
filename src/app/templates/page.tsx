"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The Templates gallery has been folded into Designs: browse by look, open a
// design to see every screen, and create from the "Start something new" section
// there. This route stays as a client redirect so old links and bookmarks still
// land (the site is a static export, so a server redirect isn't available).
export default function TemplatesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <div className="app-bg min-h-screen" />;
}
