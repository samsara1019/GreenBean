// 서버 컴포넌트 — 세션에서 사용자를 확인하고 UI에 넘긴다.
// (미로그인 차단은 middleware 가 먼저 하지만, 직접 렌더될 경우를 대비해 한 번 더.)

import { redirect } from "next/navigation";
import { getUser, DEV_FALLBACK } from "../../lib/auth.js";
import DashboardClient from "./dashboard-client.js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <DashboardClient
      email={user.email || ""}
      devFallback={DEV_FALLBACK}
    />
  );
}
