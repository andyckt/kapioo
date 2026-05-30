export function buildCombinationLabel(input: {
  baseSplitName: string;
  meetupShortLabel: string;
  meetupFixedStopPosition: 1 | 2;
  handoffSkipped?: boolean;
}): string {
  if (input.handoffSkipped) {
    return `${input.baseSplitName} + no handoff preview`;
  }

  return `${input.baseSplitName} + ${input.meetupShortLabel} #${input.meetupFixedStopPosition}`;
}

export function shortenMeetupLabel(input: {
  area: string;
  formattedAddress: string;
  preferredZoneLabel?: string;
}): string {
  if (input.area.trim().toLowerCase() === "north york" && input.preferredZoneLabel) {
    return `${input.preferredZoneLabel} meet-up`;
  }

  const firstSegment = input.formattedAddress.split(",")[0]?.trim();
  if (firstSegment) {
    return `${firstSegment} meet-up`;
  }

  return `${input.area} meet-up`;
}
