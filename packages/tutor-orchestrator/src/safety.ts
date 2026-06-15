// Child-safety layer at the service boundary (prompt 10).
//
// Two pure, deterministic enforcements — no model, no network — so they run BEFORE
// any generation and are trivially testable (mirrors the rule-based classifyTurn):
//
//   screenTurn()      — input-side. Refuse unsafe requests, refuse attempts to
//                       circumvent a student's school/parental context, and redirect
//                       clearly off-topic asks. Tuned for PRECISION so legitimate
//                       maths (incl. ordinary homework help) is never refused.
//   enforceHintOnly() — output-side. In hint_only mode, drop any surviving claim that
//                       reveals a decisive result. This backstops the correctness
//                       gate, whose CORRECTNESS_SHAPE misses bare equations ("x = 2")
//                       and "equals N". It NEVER relaxes the gate — it only removes more.
//
// LLM_RULES.md already forbids the model from producing this content; this is the
// mechanical enforcement that does not depend on the model cooperating.

import type { MathsClaim, StudentTurn } from '@imaia/contracts';

export type SafetyCategory =
  | 'self_harm'
  | 'violence'
  | 'sexual'
  | 'illegal'
  | 'hate'
  | 'circumvention'
  | 'off_topic';

export type SafetyDecision =
  | { action: 'allow' }
  | { action: 'refuse' | 'redirect'; category: SafetyCategory; reply: string };

// Kind, age-appropriate, learning-forward copy. Deliberately NOT correctness-shaped.
export const SAFETY_COPY: Record<SafetyCategory, string> = {
  self_harm:
    "I'm really glad you reached out, and I'm sorry you're going through something hard. " +
    'I can\'t help with this, but please talk to someone you trust — a parent, teacher, or ' +
    'a helpline in your country. When you\'re ready, I\'m here to help with your maths.',
  violence:
    "I can't help with anything that could hurt someone. If something is worrying you, please " +
    'talk to a trusted adult. I\'m happy to keep working through your maths whenever you like.',
  sexual:
    "That's not something I can help with — I'm a maths tutor here to help you learn. " +
    'Let\'s get back to a maths question whenever you\'re ready.',
  illegal:
    "I can't help with that. I'm here to help you learn maths, though — want to pick up where " +
    'we left off?',
  hate:
    "I won't help with that. Everyone deserves respect. I'm here for your maths, so let's keep " +
    'it kind and get back to the problem.',
  circumvention:
    "I can't help get around your school's or family's settings, or do an assessment for you — " +
    'that wouldn\'t really help you learn. But I\'d love to help you understand the maths so you ' +
    'can do it yourself. Where are you stuck?',
  off_topic:
    "I'm your maths tutor, so that's a bit outside what I can help with. Is there a maths problem " +
    'or topic I can help you with instead?',
};

interface Rule {
  category: SafetyCategory;
  action: 'refuse' | 'redirect';
  pattern: RegExp;
}

// Precision-first patterns: target explicit harmful/circumvention intent, not topics a
// maths word-problem might mention in passing. Self-harm is checked first.
const REFUSE_RULES: Rule[] = [
  {
    category: 'self_harm',
    action: 'refuse',
    pattern:
      /\bkill myself\b|\b(hurt|harm|cut)\s+myself\b|\bsuicid(e|al)\b|\bself[- ]harm\b|\bend (my|it all) life\b|\bwant to die\b|\bdon'?t want to (live|be alive)\b/i,
  },
  {
    category: 'violence',
    action: 'refuse',
    pattern:
      /\bhow (to|do i|can i)\s+(make|build|create)\s+(a\s+)?(bomb|explosive|weapon|gun|poison)\b|\bmake a (bomb|weapon|poison)\b|\bhow (to|do i)\s+(hurt|attack|kill|stab|shoot)\s+(someone|people|him|her|them|my\b)/i,
  },
  {
    category: 'sexual',
    action: 'refuse',
    pattern: /\bsexual\b|\bporn(ography)?\b|\bnudes?\b|\bnaked\b|\bsext(ing|s)?\b|\bsend (me )?(a )?(nude|pic)/i,
  },
  {
    category: 'illegal',
    action: 'refuse',
    pattern:
      /\bhow (to|do i|can i)\s+(make|buy|sell|get|score)\s+(drugs|cocaine|meth|heroin|weed|marijuana|fentanyl)\b|\bhow (to|do i)\s+(hack|break into)\b|\bbuy a gun\b/i,
  },
  {
    category: 'hate',
    action: 'refuse',
    pattern: /\bkill all\s+\w+|\b(i hate|death to)\s+(all\s+)?(jews|muslims|christians|black|gay|trans)\b/i,
  },
  {
    category: 'circumvention',
    action: 'refuse',
    pattern:
      /\b(bypass|get around|get past|disable|turn off|defeat|circumvent|unblock)\b[^.?!]{0,40}\b(filter|block(er|ing)?|monitor(ing)?|parental|control|restriction|firewall|school'?s? (wifi|network|filter))\b|\bwithout (my|the)\s+(teacher|parent|mum|mom|dad|school)[^.?!]{0,30}\b(know|knowing|finding out|seeing)\b|\b(do|take|sit|write)\s+(my|the)\s+(exam|test)\s+for me\b|\bcheat\b[^.?!]{0,20}\b(test|exam|quiz)\b/i,
  },
];

// Off-topic intent — non-maths asks. Only redirects when there is NO maths signal,
// so a legitimate maths question is never caught.
const OFF_TOPIC_INTENT =
  /\b(write|do|finish|help with)\s+(my|the|a|an)\s+(essay|story|poem|english|history|geography|biology|chemistry|book report|assignment on)\b|\bwhat'?s the weather\b|\btell me a joke\b|\bwho (won|is winning)\b|\b(recommend|suggest)\s+(me\s+)?(a\s+)?(movie|film|song|game|book|restaurant)\b|\bwrite (me )?(some |a )?(code|program|poem|song)\b/i;

const MATHS_SIGNAL =
  /[0-9=+\-*/^√π∫∑]|\b(solve|equation|integral|derivative|differentiate|integrate|factor(ise|ize)?|simplify|expand|fraction|algebra|geometry|trig(onometry)?|calculus|quadratic|polynomial|graph|theorem|prove|proof|angle|triangle|probability|matrix|vector|sequence|series|logarithm|surd|hint|stuck|marks?|working|steps?|maths?|sum|product|mean|median)\b/i;

/** Decide whether a turn may proceed, or must be refused / redirected. */
export function screenTurn(turn: StudentTurn): SafetyDecision {
  const msg = turn.message;

  for (const rule of REFUSE_RULES) {
    if (rule.pattern.test(msg)) {
      return { action: rule.action, category: rule.category, reply: SAFETY_COPY[rule.category] };
    }
  }

  // Off-topic is a conservative *redirect*: only when it reads as a non-maths ask
  // AND carries no maths signal at all.
  if (OFF_TOPIC_INTENT.test(msg) && !MATHS_SIGNAL.test(msg)) {
    return { action: 'redirect', category: 'off_topic', reply: SAFETY_COPY.off_topic };
  }

  return { action: 'allow' };
}

// A decisive result: a final answer or value the student must not be handed in hint
// mode. Catches the cases the gate's CORRECTNESS_SHAPE lets through (bare equations,
// "equals N", a lone number). Pure method/strategy hints have none of these.
const DECISIVE_RESULT =
  /\b[a-z]\s*=\s*[-+]?\d|=\s*[-+]?\d|\bequals\s+[-+]?\d|\bthe (final )?(answer|value|result|solution) is\b|^\s*[-+]?\d+(?:\.\d+)?\s*$/i;

/** Hint-mode output filter: drop any claim that reveals a decisive result. Layered
 *  AFTER the correctness gate; only removes claims, never adds or relaxes. */
export function enforceHintOnly(claims: MathsClaim[]): MathsClaim[] {
  return claims.filter((c) => !DECISIVE_RESULT.test(c.text));
}
