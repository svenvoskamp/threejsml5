let classifier;
const options = { probabilityThreshold: 0.7 };

let label;
let confidence;

function preload() {
  
  classifier = ml5.soundClassifier('SpeechCommands18w', options);
}

function setup() {
  noCanvas();
  classifier.classify(gotResult);
}




let analyser,
source,
audioData,
uniforms,
scene,
cubes;


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const fragmentShader = `//
// Color version of: https://www.shadertoy.com/view/XlXGDf
//
// Based on: https://www.shadertoy.com/view/4dfSRS
//

#define SOUND_MULTIPLIER 1.0
uniform vec3 iResolution;
uniform float iTime;
uniform float effectFactor;
uniform float effectFactor2;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
vec2 uv = (fragCoord.xy / iResolution.xy);
uv -= vec2(0.5);
uv.x *= iResolution.x/iResolution.y;

// Calculate polar coordinates
float r = length(uv);
float a = atan(uv.y, uv.x);

// Draw the lines
const float it = 5.0;
float c = 0.0;
for( float i = 0.0 ; i < it ; i += 1.0 )
{
float i01 = i / it;
float rnd = texture( iChannel0, vec2(i01)).x;
float react = SOUND_MULTIPLIER * texture( iChannel1, vec2(i01, 0.0) ).x;    

float c1 = (uv.x + 1.1 + react) * 0.004 * abs( 1.0 / sin( (uv.y +0.25) +
                                                sin(uv.x * 4.0 * rnd + rnd * 7.0 + iTime * 0.75) *
                                                        (0.01 + 0.15*react)) );
c = clamp(c + c1, 0.0, 1.0);
}

float s = 0.0;
const float it2 = 20.0;
for( float i = 0.0 ; i < it2 ; i += 1.0 )
{
float i01 = i / it2;       
float react = SOUND_MULTIPLIER * texture( iChannel1, vec2(i01, 0.0) ).x;  
vec2 rnd = texture( iChannel0, vec2(i01)).xy;
vec2 rnd2 = rnd - 0.5;

rnd2 = vec2(0.85*sin(rnd2.x * 200.0 + rnd2.y * iTime * 0.1), 
            -0.1 - 0.15 * sin(rnd2.x * rnd2.x * 200.0 + iTime  * rnd2.x * 0.25));

float r1 = 1.0 - length(uv - rnd2);
float rad = ( 1.0 - clamp(0.03 * rnd.y + react * 0.05, 0.0, 1.0) );

r1 = smoothstep(rad, rad + 0.015, r1);
s += r1;
}


// Calculate the final color mixing lines and backgrounds
vec3 bg = mix( vec3(0.93, 0.71, effectFactor), vec3(effectFactor2, 0.44, 0.44), r);
bg = mix(bg, vec3(effectFactor2, 0.91, 0.62), c);
bg = mix(bg, vec3(effectFactor, effectFactor2, 0.82), s);

fragColor = vec4(bg, 1.0);

}
varying vec2 vUv;

void main() {
mainImage(gl_FragColor, gl_FragCoord.xy);
}`;

document.querySelector('button').addEventListener('click', () => {
audioCtx.resume().then(() => {
    startMic();
});
});

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({canvas});

renderer.autoClearColor = true;

const fov = 70;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 5;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;

const createScene = () => {
scene = new THREE.Scene();
scene.background = new THREE.Color( 0xffffff );
const boxWidth = 1;
const boxHeight = 1;
const boxDepth = 1;
const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3() },
    iChannel0: { value: new THREE.DataTexture(audioData, analyser.fftSize/100, 30, THREE.LuminanceFormat) },
    iChannel1: { value: new THREE.DataTexture(audioData, analyser.fftSize/10, 1, THREE.LuminanceFormat) },
    effectFactor: { value: 1.0},
    effectFactor2: { value: 1.0}
};

const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
});

function makeInstance(geometry, x) {
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.x = x;
    cube.position.y = -0.2;
    return cube;
}

cubes = [
    makeInstance(geometry,  0)
];
}

navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||navigator.msGetUserMedia;

const resizeRendererToDisplaySize = renderer => {
const needResize = canvas.width !== window.innerWidth ||
canvas.height !== window.innerHeight;
if (needResize) {
renderer.setSize(window.innerWidth, window.innerHeight);
}
return needResize;
}

const animate = time => {
requestAnimationFrame(animate);

resizeRendererToDisplaySize(renderer);

analyser.getByteFrequencyData(audioData);

time *= 0.001;

uniforms.iTime.value = time;
uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
uniforms.iChannel0.value.needsUpdate = true;
uniforms.iChannel1.value.needsUpdate = true;

cubes.forEach((cube, ndx) => {
const speed = 1 + ndx * .1;
const rot = time * speed;
cube.rotation.y = rot;
});

renderer.render(scene, camera);

}
function gotResult(error, results) {
    // Display error in the console
    if (error) {
      console.error(error);
    }
    // The results are in an array ordered by confidence.
    console.log(results);
    if(results[0].label === 'down'){
        console.log("cube moet omlaag");
        cubes[0].position.y = -0.3;
    }
    if(results[0].label === 'up'){
        console.log("cube moet omhoog");
        cubes[0].position.y = 0.3;
    }
    if(results[0].label === 'right'){
        console.log("cube moet naar rechts");
        cubes[0].position.x = 1;
    }
    if(results[0].label === 'left'){
        console.log("cube moet naar links");
        cubes[0].position.x = -1;
    }
    if(results[0].label === 'yes'){
        console.log("cube moet van kleur veranderen");
        uniforms.effectFactor.value = Math.random();
        uniforms.effectFactor2.value = Math.random();
    }
  }

const startMic = () =>{
if (navigator.getUserMedia) {
    navigator.getUserMedia({ audio: true, video: false }, stream => {
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 1024;
    audioData = new Uint8Array(analyser.frequencyBinCount);
    createScene();
    animate();
    }, () => {});
} else {
}
}


