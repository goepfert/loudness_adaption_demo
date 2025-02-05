/**
 * Direct Form 1 Biquad Filter
 * Inspired by https://github.com/Ircam-RnD/biquad-filter
 *
 * (co)author: Thomas Goepfert
 */

class BiquadFilter_DF1 {
  constructor() {
    this.numberOfCascade = 1;
    this.coefficients = [];
    this.memories = [];
  }

  /**
   * Set biquad filter coefficients
   * coef Array of biquad coefficients in the following order: gain, firstBiquad b0, firstBiquad b1, firstBiquad b2, firstBiquad a1, firstBiquad a2, secondBiquad b0, secondBIquad b1, etc.
   */
  setCoefficients(coef) {
    if (coef) {
      // If there is not a number of biquads, we consider that there is only 1 biquad.
      this.numberOfCascade = this.getNumberOfCascadeFilters(coef);
      // Reset coefficients
      this.coefficients = [];
      // Global gain
      this.coefficients.gain = coef[0];

      for (let i = 0; i < this.numberOfCascade; i++) {
        // Five coefficients for each biquad
        this.coefficients[i] = {
          b0: coef[1 + i * 5],
          b1: coef[2 + i * 5],
          b2: coef[3 + i * 5],
          a1: coef[4 + i * 5],
          a2: coef[5 + i * 5],
        };
      }

      // Need to reset the memories after change the coefficients
      this.resetMemories();
      return true;
    } else {
      throw new Error('No coefficients are set');
    }
  }

  /**
   * Get the number of cascade filters from the list of coefficients
   */
  getNumberOfCascadeFilters(coef) {
    return (coef.length - 1) / 5;
  }

  /**
   * Reset memories of biquad filters.
   */
  resetMemories() {
    this.memories = [
      {
        xi1: 0,
        xi2: 0,
        yi1: 0,
        yi2: 0,
      },
    ];
    for (let i = 1; i < this.numberOfCascade; i++) {
      this.memories[i] = {
        yi1: 0,
        yi2: 0,
      };
    }
  }

  /**
   * Calculate the output of the cascade of biquad filters for an inputBuffer.
   * inputBuffer: array of the same length of outputBuffer
   * outputBuffer: array of the same length of inputBuffer
   */
  process(inputBuffer, outputBuffer) {
    let x;
    let y = [];
    let b0, b1, b2, a1, a2;
    let xi1, xi2, yi1, yi2, y1i1, y1i2;

    for (let bufIdx = 0; bufIdx < inputBuffer.length; bufIdx++) {
      x = inputBuffer[bufIdx];

      // Save coefficients in local variables
      b0 = this.coefficients[0].b0;
      b1 = this.coefficients[0].b1;
      b2 = this.coefficients[0].b2;
      a1 = this.coefficients[0].a1;
      a2 = this.coefficients[0].a2;

      // Save memories in local variables
      xi1 = this.memories[0].xi1;
      xi2 = this.memories[0].xi2;
      yi1 = this.memories[0].yi1;
      yi2 = this.memories[0].yi2;

      // Formula: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
      // First biquad
      y[0] = b0 * x + b1 * xi1 + b2 * xi2 - a1 * yi1 - a2 * yi2;

      for (let cascadeIdx = 1; cascadeIdx < this.numberOfCascade; cascadeIdx++) {
        b0 = this.coefficients[cascadeIdx].b0;
        b1 = this.coefficients[cascadeIdx].b1;
        b2 = this.coefficients[cascadeIdx].b2;
        a1 = this.coefficients[cascadeIdx].a1;
        a2 = this.coefficients[cascadeIdx].a2;

        y1i1 = this.memories[cascadeIdx - 1].yi1;
        y1i2 = this.memories[cascadeIdx - 1].yi2;
        yi1 = this.memories[cascadeIdx].yi1;
        yi2 = this.memories[cascadeIdx].yi2;

        y[cascadeIdx] = b0 * y[cascadeIdx - 1] + b1 * y1i1 + b2 * y1i2 - a1 * yi1 - a2 * yi2;
      }

      // Write the output
      outputBuffer[bufIdx] = this.coefficients.gain * y[this.numberOfCascade - 1];

      // Update the memories
      this.memories[0].xi2 = this.memories[0].xi1;
      this.memories[0].xi1 = x;

      for (let cascadeIdx = 0; cascadeIdx < this.numberOfCascade; cascadeIdx++) {
        this.memories[cascadeIdx].yi2 = this.memories[cascadeIdx].yi1;
        this.memories[cascadeIdx].yi1 = y[cascadeIdx];
      }
    } // next buffer element
  } // end process
}

export default BiquadFilter_DF1;
