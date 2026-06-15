// @imaia/contracts
//
// Shared service contract types for the IMAIA grounded tutor, transcribed from
// context/INTERFACES.md (prompt 02). Each contract is a zod schema plus its
// inferred TypeScript type; the maths-service shapes mirror
// services/maths/app/models.py so both sides share one contract. No business
// logic lives here — schemas describe shapes only.
export * from "./shared.js";
export * from "./retrieval.js";
export * from "./verification.js";
export * from "./diagnosis.js";
export * from "./tutor.js";
export * from "./services.js";
