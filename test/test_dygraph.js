console.log('hi');

let x1 = 0;
let x2 = 0;
let y = 0;
let z = 0;
let data = [];
data.push([x1,y,z]);

let g = new Dygraph(document.getElementById("graphdiv"), data, {
    drawPoints: true,
    labels: [ "x", "A", "B" ]
    //showRoller: true,
});

let interval = setInterval(fill, 5);
// let interval2 = setInterval(fill2, 200);

function fill() {
    y = Math.random();
    data.push([x1, y, null]);
    g.updateOptions({ 'file': data });
    x1++;
}

function fill2() {
    z = Math.random();
    data.push([x2, null, z]);
    g.updateOptions({ 'file': data });
    x2++;
}

document.addEventListener('click', () => {clearInterval(interval); clearInterval(interval2)});