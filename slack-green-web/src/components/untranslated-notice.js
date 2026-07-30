// 아직 한국어 원문만 있는 페이지(약관·환불·개인정보·블로그) 상단 안내.
//
// 번역 없는 페이지에 아무 표시 없이 한국어를 띄우면 "깨진 사이트"로 읽힌다.
// 한 줄이라도 방문자 언어로 상황을 알려주는 편이 이탈을 줄인다.
// 색인 차단(noindex·canonical)은 seo.js 의 pageMetadata 가 함께 처리한다.

import { getLocale, getTranslations } from "next-intl/server";
import { defaultLocale } from "../i18n/routing.js";

export default async function UntranslatedNotice() {
  const locale = await getLocale();
  if (locale === defaultLocale) return null;

  const t = await getTranslations("common.untranslated");

  return (
    <div className="notice" style={{ marginBottom: 20 }}>
      <span aria-hidden="true">🌐</span>
      <p style={{ margin: 0 }}>
        <strong>{t("title")}</strong> {t("body")}
      </p>
    </div>
  );
}
