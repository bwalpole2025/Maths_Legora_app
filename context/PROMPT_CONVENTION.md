# PROMPT_CONVENTION — How Every Prompt Is Written

**Status: canonical. Read once; it explains the shape of every file in `prompts/`.**

## One prompt = one slice

- Each prompt produces **one** coherent, tested, committed deliverable.
- **No prompt spans the grounding↔verification boundary.** If a task seems to
  need both, it's two prompts — or the boundary is being eroded. Stop and check.
- Run prompts in order; don't start a phase until the previous phase's gate is
  green.

## Every prompt contains these sections

1. **Deliverable** — the single thing this prompt produces.
2. **Read first** — always `context/ARCHITECTURE.md`, `context/INTERFACES.md`,
   `context/LLM_RULES.md`, plus any others relevant.
3. **Conform to (do not modify)** — the contracts / docs this must respect.
4. **Out of scope / do not touch** — explicit boundaries, including the standing
   boundary: *do not add any path where the model decides correctness.*
5. **Tests (definition of done)** — what must be written and pass.

## Working with existing code

Several prompts wrap code you already have (SymPy verifier, diagnosis engine,
Mathpix path, `Question[]` bank). For those:

- **Locate and wrap** the existing implementation behind the contract. Do **not**
  reimplement it from scratch.
- If a required piece is genuinely missing, implement **only** the missing piece,
  against the contract.
- Preserve existing behaviour; the contract is an adapter, not a rewrite.
