// ⚠️ TODO(prod): 사업자등록 후 실제 값으로 교체할 것.
// 전자상거래법상 아래 정보는 사이트에 표기 의무가 있다(footer 등).
// 사업자정보 한 줄 문자열. **빈 값은 라벨까지 통째로 빼버린다** —
// "사업자등록번호 " 처럼 라벨만 남으면 정보가 누락된 것보다 나쁘게 보이고,
// 가짜 번호를 넣는 것은 허위 표기라 더 위험하다. 사업자등록/통신판매업 신고를
// 마치면 business.js 에 값을 채우면 이 줄에 자동으로 나타난다.
export function businessLine() {
  const parts = [
    BUSINESS.service,
    BUSINESS.company && BUSINESS.company !== BUSINESS.service ? BUSINESS.company : null,
    BUSINESS.owner ? `대표 ${BUSINESS.owner}` : null,
    BUSINESS.bizNo ? `사업자등록번호 ${BUSINESS.bizNo}` : null,
    BUSINESS.mailOrderNo ? `통신판매업신고 ${BUSINESS.mailOrderNo}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

// 연락처 한 줄 (주소·이메일·전화 중 있는 것만).
export function contactLine() {
  return [BUSINESS.address, BUSINESS.email, BUSINESS.phone].filter(Boolean).join(" · ");
}

export const BUSINESS = {
  service: "Green Bean",
  company: "Green Bean",
  owner: "이시아",
  bizNo: "", // 사업자등록번호
  mailOrderNo: "", // 통신판매업 신고번호
  address: "",
  email: "samsarayunhye@gmail.com",
  phone: "010-9915-1944",
  host: "Green Bean",
};
