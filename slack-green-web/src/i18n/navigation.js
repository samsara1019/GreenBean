// 로케일을 자동으로 유지하는 네비게이션 도구.
//
// ⚠️ 앱 내부 이동은 next/link · next/navigation 대신 **반드시 여기서** 가져온다.
// next/link 로 href="/login" 을 쓰면 /en 페이지에서 눌렀을 때 한국어 /login 으로
// 떨어진다. 여기 Link 는 현재 로케일을 붙여 /en/login 으로 보낸다.
//
// 외부 링크(Groble 결제 페이지 등)는 그냥 <a> 를 쓴다.

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing.js";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
