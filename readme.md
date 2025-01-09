# Live Loudness Demo
- Algorithm based on [ITU-R BS.1770-5](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf)
- Implemented in plain javascript using Web Audio API


## Usage
- Clone repository and open *index.html* file in Browser (tested with FF 60.1.0esr)
- Audio files sample including test files from [ITU-R-BS.2217](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2217-2-2016-PDF-E.pdf) and a couple of others located under /files subdirectory
- Open audio file via *Select File* Button
  - Depending on the files size and format this may take some seconds
- Adjust parameters if needed an *Play*
- Or visit github pages: https://goepfert.github.io/loudness_adaption_demo/


## Parameters
**Interval Size**
The file (stream) will be segmented in time intervals of given size. This is the smallest segment a loudness can be calculated. Defaults to 400 ms.

**Overlap between Intervals**
The Intervals can overlap each other. Defaults to 75%.

**Window Size**
How many seconds the algorithm shall look back if enough data is available.


## Signal Flow
AudioBufferSource -> Live Loudness Calculation (Web Audio Script Processor)
                  -> Gain Control -> Post Loudness Calculation (Web Audio Script Processor)
                                  -> Volume Meter (Web Audio Script Processor)
                                  -> Audio Out


## What is plotted
**Live Loudness**
The current calculated loudness from the start of the file (if not in loop) or since last reset (Button: *Reset Loudness Calculation*). The total time is limited to the Window Size parameter (default: 30 seconds).

**Target Loudness**
The target loudness in LKFS before any audio processing.

**Target Gain**
The gain to compensate the difference between *Live Loudness* and *Target Loudness*. The target gain is directly applied with an exponential ramp and a decay constants that can be parametrised in dB/s. (The timeConstant is set to get 95%, for details see [here](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)). The gain correction can be bypassed by unchecking the checkbox *apply gain orrection*. 
*Remark*: There is no clipping control implemented.

**Loudness after gain control**
The Loudness is (re)calculted after setting the target gain with a fixed Window Size of 1 second.


## Volume Meter
A simple attempt to check if there is clipping. It checks if there are samples with values near the maximum (abs(value) > 0.98) within the last 250 ms. If so, it meter graph turns red.
