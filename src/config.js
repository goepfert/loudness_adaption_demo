/**
 * Some global configuration parameters
 */

const Config = {
  /**
   * Enable or disable debug mode.
   * @type {boolean}
   */
  debug: true,

  /**
   * Maximum loudness index.
   * @type {number}
   */
  maxT_loudness_idx: 2,

  /**
   * Maximum time in seconds for loudness re-calculation.
   * @type {number}
   */
  maxT_recalc_loudness: 4,

  /**
   * Default target loudness in LUFS.
   * @type {number}
   */
  defaultTargetLoudness: -23,

  /**
   * Audio meter Clipping lag in milliseconds.
   * @type {number}
   */
  audioMeter_cliLag: 250,
};

// Freeze the configuration object to make it immutable
Object.freeze(Config);

export { Config };
