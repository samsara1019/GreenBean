"use client";

// 언어 선택기.
//
// next-intl 의 usePathname 은 로케일 접두사가 **제거된** 경로를 준다
// (/en/blog → /blog). 그래서 같은 경로를 다른 로케일로 다시 밀어넣기만 하면
// 되고, 접두사 계산은 router 가 알아서 한다.

import { Suspense, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../i18n/navigation.js";
import { locales, LOCALE_LABEL } from "../i18n/routing.js";

function LocaleSwitcherInner() {
  const t = useTranslations("common.localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event) {
    const next = event.target.value;
    const query = searchParams.toString();
    startTransition(() => {
      // replace 로 바꾼다 — push 면 뒤로가기가 언어 전환 이력에 걸려
      // 사용자가 이전 페이지로 돌아가지 못한다.
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
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

// useSearchParams() 는 정적 생성 시 Suspense 경계를 요구한다(없으면 해당 페이지
// 프리렌더가 실패한다). 쓰는 쪽에서 매번 감싸는 걸 잊지 않도록 여기서 감싼다.
export default function LocaleSwitcher() {
  return (
    <Suspense fallback={null}>
      <LocaleSwitcherInner />
    </Suspense>
  );
}
