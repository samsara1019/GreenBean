import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth.js";
import { updateConnection, deleteConnection } from "../../../../lib/db.js";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const { userId, response } = await requireUserId();
  if (response) return response;
  const body = await request.json();
  try {
    const item = await updateConnection(userId, params.id, body);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  const { userId, response } = await requireUserId();
  if (response) return response;
  await deleteConnection(userId, params.id);
  return NextResponse.json({ ok: true });
}
