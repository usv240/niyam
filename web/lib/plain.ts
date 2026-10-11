// Plain-English names for the agent's technical labels.
export const CHANGE_TYPE: Record<string, string> = {
  parameter_update: "A number or list changed",
  condition_added: "New condition added",
  condition_removed: "Condition removed",
  condition_changed: "Condition reworded",
  definition_changed: "Definition changed",
  benefit_changed: "Amount paid changed",
  scheme_created: "New scheme created",
  scheme_closed: "Scheme closed",
  effective_date_changed: "Start date changed",
};

export const AFFECTS: Record<string, string> = {
  widens: "more people eligible",
  narrows: "fewer people eligible",
  mixed: "some gain, some lose",
  neutral: "no one gains or loses eligibility",
};

export const plainChange = (type: string) => CHANGE_TYPE[type] ?? type.replaceAll("_", " ");
export const plainAffects = (a: string) => {
  const s = AFFECTS[a] ?? a;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
