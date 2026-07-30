"use client";

// 언어 선택기.
//
// next-intl 의 usePathname 은 로케일 접두사가 **제거된** 경로를 준다
// (/en/blog → /blog). 그래서 같은 경로를 다른 로케일로 다시 밀어넣기만 하면
// 되고, 접두사 계산은 router 가 알아서 한다.
//
// ⚠️ useSearchParams() 는 쓰지 않는다. 이 훅을 쓰면 정적 렌더 시 Suspense
// 경계가 필요해지고, 그러면 선택기가 서버 HTML에 아예 안 실린다(폴백만 나감).
// 언어 선택기는 첫 페인트에 보여야 하는 UI라 그 대가가 크다. 쿼리스트링은
// 클릭 시점에 window.location.search 로 읽으면 충분하다.

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../i18n/navigation.js";
import { locales, LOCALE_LABEL } from "../i18n/routing.js";

export default function LocaleSwitcher() {
  const t = useTranslations("common.localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event) {
    const next = event.target.value;
    const search = typeof window === "undefined" ? "" : window.location.search;
    startTransition(() => {
      // replace 로 바꾼다 — push 면 뒤로가기가 언어 전환 이력에 걸려
      // 사용자가 이전 페이지로 돌아가지 못한다.
      router.replace(`${pathname}${search}`, { locale: next });
    });
  }

  return (
    <select
      aria-label={t("label")}
      value={locale}
      onChange={onChange}
      disabled={pending}
      style={{ width: "auto", padding: "6px 10px", fontSize: 14 }}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABEL[l]}
        </option>
      ))}
    </select>
  );
}
