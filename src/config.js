/**
 * Some global configuration parameters
 *
 * author: Thomas Goepfert
 */

const Config = {
  /**
   * Enable or disable debug mode.
   * @type {boolean}
   */
  debug: false,

  /**
   * Maximum loudness index.
   * @type {number}
   */
  maxT_loudness_idx: 1,

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

  shelving: {
    feedforward: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    feedback: [1.0, -1.69065929318241, 0.73248077421585],
  },

  highpass: {
    feedforward: [1.0, -2.0, 1.0],
    feedback: [1.0, -1.99004745483398, 0.99007225036621],
  },

  timeIntervalForLoundessCalculation: 0.1, // in seconds
};

// Freeze the configuration object to make it immutable
Object.freeze(Config);

export { Config };
