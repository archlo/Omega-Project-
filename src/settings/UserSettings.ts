export class UserSettings {
  funcKeyMap: Record<string, string> = {};
  bgmVolume = 80;
  sfxVolume = 100;
  // TODO_AUDIT.md Hundred-and-seventieth pass: OG CConfig defaults
  // nSysOpt_HPFlash/nSysOpt_MPFlash to 10, with threshold = setting * 5%.
  hpFlash = 10;
  mpFlash = 10;
  resW = 1024;
  resH = 768;
  language = 'en';
  // OG: CConfig::AddBlackList/DeleteBlackList/LoadBlackList — TODO_AUDIT.md
  // Eighty-second pass's `CTabBlackList` finding. Decompile-confirmed this
  // is purely local config, not a server round trip.
  blackList: string[] = [];
}
