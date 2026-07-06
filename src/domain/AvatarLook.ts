export class AvatarLook {
  gender: number = 0;
  skin: number = 0;
  face = 0;
  hair = 0;
  hairEquip = new Map<number, number>();
  unseenEquip = new Map<number, number>();
  weaponStickerId = 0;
  petIds: number[] = [0, 0, 0];
}
