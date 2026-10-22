import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSecureUrl } from "@/lib/storage";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path, bucket } = await request.json();
  if (!path || !bucket) return NextResponse.json({ error: "Missing path/bucket" }, { status: 400 });

  const url = await getSecureUrl(bucket || "documents", path);
  return NextResponse.json({ url });
}
