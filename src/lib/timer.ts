export const remainingAt = (endsAt: number, now: number): number =>
  Math.max(0, Math.ceil((endsAt - now) / 1000))
