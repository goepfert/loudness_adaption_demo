/**
 * inspired by https://github.com/cwilso/volume-meter/blob/master/volume-meter.js
 * extended for more than one channel
 * 
 * clipLevel: the level (0 to 1) that you would consider "clipping". Defaults to 0.98.
 * averaging: how "smoothed" you would like the meter to be over time. Should be between 0 and less than 1. Defaults to 0.95.
 * clipLag: how long you would like the "clipping" indicator to show after clipping has occured, in milliseconds. Defaults to 750ms.
 * 
 * (co)author: Thomas Goepfert
 */

function createAudioMeter(audioContext, nChannels, clipLevel, averaging, clipLag) {

  let processor = audioContext.createScriptProcessor(1024);
  processor.onaudioprocess = volumeAudioProcess;
  processor.clipping = [];
  processor.lastClip = [];
  processor.volume = [];
  processor.clipLevel = clipLevel || 0.98;
  processor.averaging = averaging || 0.95;
  processor.clipLag = clipLag || 750;

  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination);

  processor.checkClippingChannel = function (channel) {
    if (!this.clipping[channel]) {
      return false;
    }
    if ((this.lastClip[channel] + this.clipLag) < window.performance.now()) {
      this.clipping[channel] = false;
    }
    return this.clipping[channel];
  };

  processor.checkClipping = function() {
    for(let chIdx = 0; chIdx<this.clipping.length; chIdx++){
      if (this.checkClippingChannel(chIdx)) {
        return true;
      }
    }
    return false;
  };

  processor.shutdown = function () {
    this.disconnect();
    this.onaudioprocess = null;
  };

  for(let chIdx=0; chIdx<nChannels; chIdx++) {
    processor.volume.push(0);
    processor.clipping.push(false);
  }

  return processor;
}

function volumeAudioProcess(event) {

  let nChannels = event.inputBuffer.numberOfChannels;

  for (let chIdx = 0; chIdx < nChannels; chIdx++) {
    let buf = event.inputBuffer.getChannelData(chIdx);
    let bufLength = buf.length;
    let sum = 0;
    let x;

    // Do a root-mean-square on the samples: sum up the squares...
    for (let i = 0; i < bufLength; i++) {
      x = buf[i];
      if (Math.abs(x) >= this.clipLevel) {
        this.clipping[chIdx] = true;
        this.lastClip[chIdx] = window.performance.now();
      }
      sum += x * x;
    }

    // ... then take the square root of the sum.
    let rms = Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume[chIdx] = Math.max(rms, this.volume[chIdx] * this.averaging);
    //console.log('v', this.volume[chIdx], rms, chIdx);
  }
}