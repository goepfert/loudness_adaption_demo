# Live Dynamic Loudness Demo

- Algorithm based on [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770)
  - At time of writing, version 5 (11/2023) was the latest
- Implemented in plain javascript using Web Audio API

## Usage

- Clone repository and open _index.html_ file in Browser (tested with FF 60.1.0esr) or start webserver
- Audio files sample including test files from [ITU-R-BS.2217](https://www.itu.int/pub/R-REP-BS.2217) and a couple of others located under /files subdirectory
  - - At time of wrinting, version 2 (10/2016) was the latest
- Open audio file via _Select File_ Button
  - Depending on the files size and format this may take a little
- Adjust parameters if needed and _Play_
- You can also _Reset Loudness Calculation_. Can e.g. simulate some artificial track change while playing
- Or visit github pages: https://goepfert.github.io/loudness_adaption_demo/
  - But you would probably need some audio files (e.g. from this repo)

## Remarks

Certainly needs some more testing if properly implemented, but doesn't look so bad in the first place. It survived all tests for up to two channels from ITU-R-BS.2217. Hint: Crank up _Window Size_ to be large than the file size to check for _file_ loudness at the end of a file.
And also some refactoring and code review ...

## Parameters

**Interval Size**
The file (stream) will be segmented in time intervals of given size. This is the smallest segment a loudness can be calculated. Defaults to 400 ms.

**Overlap between Intervals**
The Intervals can overlap each other. Defaults to 75%.

**Window Size**
How many seconds the algorithm shall look back if enough data is available. Defaults to 8 seconds

## Signal Flow

AudioBufferSource -> Live Loudness Calculation (Web Audio Worklet)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -> Gain Control -> Post Loudness Calculation (Web Audio Worklet)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -> Volume Meter (Web Audio Worklet)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -> Audio Out

## What is plotted

**Live Loudness**
The current calculated loudness from the start of the file (if not in loop) or since last reset (Button: _Reset Loudness Calculation_). The total time is limited to the Window Size parameter.

**Target Loudness**
The target loudness in LKFS before any audio processing.

**Target Gain**
The gain to compensate the difference between _Live Loudness_ and _Target Loudness_. The target gain is directly applied with an exponential ramp and a decay constants that can be parametrised in dB/s. (The timeConstant is set to get 95%, for details see [here](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)). The gain correction can be bypassed by unchecking the checkbox _apply gain orrection_.
_Remark_: There is no clipping control implemented.

**Loudness after gain control**
The Loudness is (re)calculted after setting the target gain with a fixed Window Size that can be different as for Live Loudness calculation.

## Volume Meter

A simple attempt to check if there is clipping. It checks if there are samples with values near the maximum (abs(value) > 0.98) within the last 250 ms. If so, it meter graph turns red.

## TODOs

- Implement and test multi-channel audio (besides stereo).
- Check further files and prepare file with _simulated_ source change.
- Implement possibility to do _offline_ file loudness calculation, i.e. calculate file loudness without actually playing the file.
- Go away from deprecated ScriptProcessorNode
  - Done, refactored to Audio Worklet including a couple of performance optimizations (Master branch)
  - Old ScriptProcessorNode still available in branch _Scriptprocessor_deprecated_
