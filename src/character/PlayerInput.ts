export interface PlayerInput {
  Left: boolean;
  Right: boolean;
  Up: boolean;
  Down: boolean;
  JumpPressed: boolean;
}

export function CreatePlayerInput(): PlayerInput {
  return { Left: false, Right: false, Up: false, Down: false, JumpPressed: false };
}
