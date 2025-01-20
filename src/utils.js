/**
 * Some helper functions used in this project
 */

'use strict';

/**
 * Revealing Module Pattern with IIFE: https://www.geeksforgeeks.org/describe-the-revealing-module-pattern-in-javascript/
 */
const Utils = (() => {
  /**
   * Throw error with given message if condition is not met
   */
  function assert(condition, message) {
    if (!condition) {
      message = message || 'Assertion failed';
      if (typeof Error !== 'undefined') {
        throw new Error(message);
      }
      throw message; // Fallback
    }
  }

  return {
    assert,
  };
})();

export default Utils;
