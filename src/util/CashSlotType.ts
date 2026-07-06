export function getCashSlotItemType(nItemID: number): number {
  const prefix = Math.floor(nItemID / 10000);
  if (prefix < 500 || prefix > 599) return 0;
  const sub = Math.floor((nItemID % 10000) / 1000);
  if (prefix === 500) return 8;
  if (prefix === 501) return 9;
  if (prefix === 502) return 10;
  if (prefix === 503) return 11;
  if (prefix === 504) return 22;
  if (prefix === 505) return sub === 0 ? 23 : sub === 1 ? 24 : 0;
  if (prefix === 506) {
    if (sub === 0 || sub === 1) return 25;
    if (sub === 2 || sub === 3 || sub === 4) return 26;
    if (sub === 5 || sub === 6 || sub === 7 || sub === 8) return 27;
    if (sub === 9) return 65;
    if (sub === 10) return 74;
    return 0;
  }
  if (prefix === 507) {
    if (sub === 1) return 12;
    if (sub === 2) return 13;
    if (sub === 3 || sub === 9) return 14;
    if (sub === 4) return 15;
    if (sub === 5) return 47;
    if (sub === 6) return 48;
    if (sub === 7) return 61;
    if (sub === 8) return 14;
    if (sub === 10) return 49;
    if (sub === 11) return 50;
    if (sub === 12) return 51;
    if (sub === 13) return 52;
    if (sub === 14) return 53;
    if (sub === 15) return 45;
    return 0;
  }
  if (prefix === 508) return 18;
  if (prefix === 509) return 21;
  if (prefix === 510) return 20;
  if (prefix === 512) return 16;
  if (prefix === 513) return 7;
  if (prefix === 514) return 4;
  if (prefix === 515) return sub === 0 ? 1 : sub === 1 ? 2 : sub === 2 ? 3 : sub === 3 ? 35 : 0;
  if (prefix === 516) return 6;
  if (prefix === 517) return 17;
  if (prefix === 518) return 5;
  if (prefix === 519) return 28;
  if (prefix === 520) return 19;
  if (prefix === 522) return 40;
  if (prefix === 523) return 29;
  if (prefix === 524) return 30;
  if (prefix === 525) return sub === 0 ? 36 : sub === 1 ? 37 : 0;
  if (prefix === 528) return sub === 0 ? 33 : sub === 1 ? 34 : 0;
  if (prefix === 530) return 41;
  if (prefix === 533) return 31;
  if (prefix === 537) return 32;
  if (prefix === 538) return 42;
  if (prefix === 539) return 43;
  if (prefix === 540) return sub === 0 ? 53 : sub === 1 ? 54 : 0;
  if (prefix === 542) return 55;
  if (prefix === 543) return 66;
  if (prefix === 545) return sub === 0 ? 38 : sub === 1 ? 60 : 0;
  if (prefix === 546) return 58;
  if (prefix === 547) return 39;
  if (prefix === 549) return 59;
  if (prefix === 550) return 62;
  if (prefix === 551) return 63;
  if (prefix === 552) return 64;
  if (prefix === 553) return 72;
  if (prefix === 557) return 67;
  if (prefix === 561) return 71;
  if (prefix === 562) return 73;
  if (prefix === 564) return 77;
  if (prefix === 566) return 78;
  return 0;
}

export function getConsumeCashItemType(nItemID: number): number {
  const t = getCashSlotItemType(nItemID);
  const whitelist = [
    12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 34, 35, 38, 41, 43, 44, 45, 47, 48, 49, 50,
    51, 52, 53, 54, 61, 62, 64, 65, 66, 67, 71, 72, 73, 74, 75, 78,
  ];
  return whitelist.includes(t) ? t : 0;
}
