import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteSupabase, AUTH_CONFIGURED } from "../../../lib/supabase-auth.js";

export const runtime = "nodejs";

export async function POST(request) {
  if (AUTH_CONFIGURED) {
    const supabase = createRouteSupabase(cookies());
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
