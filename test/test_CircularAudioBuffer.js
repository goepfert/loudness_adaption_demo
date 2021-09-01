console.log('hi');

let copyBuffer = new CircularAudioBuffer(context, 2, 15, 41000);

let buffer1 = context.createBuffer(2,5,41000);
fillBuffer(buffer1, 1);
let buffer2 = context.createBuffer(2,5,41000);
fillBuffer(buffer2, 2);
let buffer3 = context.createBuffer(2,5,41000);
fillBuffer(buffer3, 3);
let buffer4 = context.createBuffer(2,5,41000);
fillBuffer(buffer4, 4);


console.log('----------------------');
copyBuffer.concat(buffer1);
getIndex(6);
console.log('----------------------');
copyBuffer.concat(buffer2);
console.log('----------------------');
copyBuffer.concat(buffer3);
getIndex(6);
console.log('----------------------');
copyBuffer.concat(buffer4);


console.log(copyBuffer.getChannelData(0));
console.log(copyBuffer.head);
for(let idx=0; idx<copyBuffer.getLength(); idx++) {
  getIndex(idx);
  console.log(copyBuffer.getChannelData(0)[copyBuffer.getIndex(idx)]);
}



function getIndex(index) {
  console.log('idx', index, 'Iidx', copyBuffer.getIndex(index));
}

function fillBuffer(buffer, number) {
  for (let chIdx = 0; chIdx < buffer.numberOfChannels; chIdx++) {
    let data = buffer.getChannelData(chIdx);
    for(let idx = 0; idx<buffer.length; idx++) {
      data[idx] = number;
    }
  }
}