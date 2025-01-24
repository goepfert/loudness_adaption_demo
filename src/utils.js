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

  function checkTime(i) {
    return i < 10 ? '0' + i : i;
  }

  function getTime() {
    let today = new Date(),
      h = checkTime(today.getHours()),
      m = checkTime(today.getMinutes()),
      s = checkTime(today.getSeconds()),
      ms = checkTime(today.getMilliseconds());
    return `${h}:${m}:${s}:${ms}`;
  }

  function sleep_ms(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

  return {
    assert,
    getTime,
    sleep_ms,
  };
})();

export default Utils;
