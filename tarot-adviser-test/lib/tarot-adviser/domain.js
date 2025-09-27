"use strict";

// Domain entities: Card, Spread, Reading (plain objects for simplicity)

/**
 * @typedef {Object} Card
 * @property {string} name - Tarot card name (e.g., "The Fool")
 * @property {"upright"|"reversed"} position - Orientation of the card
 * @property {string=} slot - Optional spread slot identifier (e.g., "past", "present")
 */

/**
 * @typedef {Object} Spread
 * @property {string} name
 * @property {string[]=} slots - Optional list of semantic positions
 */

/**
 * @typedef {Object} CardInterpretation
 * @property {string} cardName
 * @property {"upright"|"reversed"} position
 * @property {string} meaning
 * @property {string=} advice
 */

/**
 * @typedef {Object} Reading
 * @property {string} summary
 * @property {CardInterpretation[]} cards
 */

module.exports = {
  // Typedefs are exported for editor intellisense; at runtime these are no-ops.
};

