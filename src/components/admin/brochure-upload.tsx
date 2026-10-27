"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export function BrochureUpload() {
  const [status, setStatus] = useState<"loading" | "none" | "uploaded">("loading");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/offers/brochure")
      .then((r) => r.json())
      .then((d) => setStatus(d.exists ? "uploaded" : "none"))
      .catch(() => setStatus("none"));
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/offers/brochure", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setStatus("uploaded");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading
          ? "Uploading..."
          : status === "uploaded"
            ? "Update Brochure"
            : "Upload Brochure"}
      </Button>
      {status === "uploaded" && (
        <span className="text-xs text-green-600">Brochure attached</span>
      )}
    </>
  );
}
