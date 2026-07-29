import { NextResponse } from "next/server";
import { requireUserId } from "../../../lib/auth.js";
import { listConnections, createConnection } from "../../../lib/db.js";

// 이 라우트들은 node crypto/fs를 쓰므로 Edge가 아닌 Node 런타임에서 실행.
export const runtime = "nodejs";
// GET이 빌드타임에 정적 캐시되지 않도록 강제.
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, response } = await requireUserId();
  if (response) return response;
  const items = await listConnections(userId);
  return NextResponse.json({ items });
}

export async function POST(request) {
  const { userId, response } = await requireUserId();
  if (response) return response;
  const body = await request.json();

  if (!body.xoxc || !body.xoxd) {
    return NextResponse.json({ error: "xoxc, xoxd는 필수입니다." }, { status: 400 });
  }

  try {
    const created = await createConnection(userId, {
      teamName: body.teamName,
      xoxc: body.xoxc,
      xoxd: body.xoxd,
      schedule: body.schedule,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e) {
    // 개수 제한 초과 → 403
    if (e.code === "LIMIT") {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }
}
