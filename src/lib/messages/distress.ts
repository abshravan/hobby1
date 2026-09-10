/**
 * Lightweight distress-language check.
 *
 * This is a hard override in the trigger logic, not a style choice: when it
 * matches, the user gets a plain supportive message with no joke, no streak,
 * no badge and no percentage — regardless of their tone setting.
 *
 * It is deliberately crude and deliberately over-inclusive. A false positive
 * costs someone one gentle message instead of a joke; a false negative means
 * roasting someone who is struggling. Those are not comparable, so the
 * patterns lean toward catching too much.
 *
 * It is NOT a risk assessment and must never be described as one. It only
 * decides which copy the app is allowed to show.
 */

/**
 * Phrases that indicate hopelessness or self-worth language beyond ordinary
 * frustration with a task. Ordinary frustration ("this is impossible", "I keep
 * putting this off") is intentionally absent — the app is allowed to joke
 * about that, and flagging it would make the override meaningless.
 */
const DISTRESS_PATTERNS: RegExp[] = [
  // Self-harm and suicidality.
  /\bkill(ing)? my ?self\b/,
  /\b(want|wanna|going) to die\b/,
  /\bend (it all|my life)\b/,
  /\bno (point|reason) (in|to) (living|being here|going on|carrying on|keep(ing)? going|continuing)\b/,
  /\bnot worth living\b/,
  /\bhurt(ing)? my ?self\b/,
  /\bself[- ]harm\b/,
  /\b(better|best) off without me\b/,
  /\bdon'?t want to (be here|exist|wake up)\b/,

  // Hopelessness.
  /\bcan'?t (go on|do this any ?more|keep going)\b/,
  /\bnothing (matters|will ever change|ever gets better)\b/,
  /\b(everything|it all) feels? (pointless|hopeless|meaningless)\b/,
  /\bgiv(e|ing) up on (life|myself|everything)\b/,
  /\bno hope\b/,
  /\bhopeless\b/,

  // Self-worth. The lead-in covers the ways people actually phrase this
  // ("I feel worthless", "I'm just a failure", "I feel like I'm a waste") —
  // requiring a bare "I'm" missed most of them.
  /\bi(?:'?m| am| feel(?: like i(?:'?m| am))?| felt|'?ve always been)\s+(?:so |such |just |really |completely |totally |a |an )*(worthless|useless|a failure|nothing|broken|pathetic|a loser|a waste|garbage)\b/,
  /\bhate my ?self\b/,
  /\bwaste of (space|air|a life|oxygen)\b/,
  /\bnobody (would|will) (care|miss me|notice)\b/,
  /\bdeserve (nothing|to be alone|to suffer)\b/,
];

/** Lowercase, normalise apostrophes and whitespace so patterns match reliably. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when free text should force plain supportive copy.
 *
 * Call this on ANY free text before selecting a message. There is no free-text
 * input in the app yet; this exists so that when one is added, the override is
 * already in the path rather than something to remember to add.
 */
export function containsDistressLanguage(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalised = normalise(text);
  return DISTRESS_PATTERNS.some((pattern) => pattern.test(normalised));
}
