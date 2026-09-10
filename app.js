'use strict';
const $=id=>document.getElementById(id);
let A=null,stream=null,micSrc=null,musicSrc=null,mg=null,mu=null,master=null,delay=null,fb=null,echo=null,reverb=null,dry=null,filter=null,analyser=null,conv=null,musicConnected=false,objectUrl=null;

function setMsg(t,good=false){$('msg').textContent=t;$('msg').className=good?'good':''}
function supported(){return !!(window.AudioContext||window.webkitAudioContext)}

async function initAudio(){
  if(A){if(A.state==='suspended') await A.resume();return A}
  if(!supported()) throw new Error('Web Audio is not supported by this browser.');
  const C=window.AudioContext||window.webkitAudioContext; A=new C();
  mg=A.createGain();mu=A.createGain();master=A.createGain();delay=A.createDelay(1.5);fb=A.createGain();echo=A.createGain();reverb=A.createGain();dry=A.createGain();filter=A.createBiquadFilter();conv=A.createConvolver();analyser=A.createAnalyser();
  analyser.fftSize=1024;
  const n=Math.floor(A.sampleRate*2.5), b=A.createBuffer(2,n,A.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.8)}
  conv.buffer=b; delay.delayTime.value=.22;fb.gain.value=.2;echo.gain.value=.2;reverb.gain.value=.25;mg.gain.value=1;mu.gain.value=.7;master.gain.value=.85;filter.type='allpass';
  mg.connect(filter);filter.connect(dry);dry.connect(master);filter.connect(delay);delay.connect(fb);fb.connect(delay);delay.connect(echo);echo.connect(master);filter.connect(conv);conv.connect(reverb);reverb.connect(master);mu.connect(master);master.connect(analyser);analyser.connect(A.destination);
  draw(); await A.resume(); return A;
}

async function startMic(){
  try{
    if(!window.isSecureContext && location.protocol!=='localhost:'){
      setMsg('❌ Mic needs HTTPS. Open the GitHub Pages HTTPS link, not the downloaded index.html.',false); return;
    }
    if(!navigator.mediaDevices?.getUserMedia){setMsg('❌ This browser does not provide microphone access.',false);return}
    await initAudio();
    if(!stream){
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      micSrc=A.createMediaStreamSource(stream); micSrc.connect(mg);
    }
    $('start').disabled=true;$('stop').disabled=false;setMsg('🎤 Microphone ON • Voice effects active',true);
  }catch(e){console.error(e);setMsg('❌ Mic failed: '+(e.name==='NotAllowedError'?'Permission denied. Allow Microphone in browser/site settings.':e.message),false)}
}
function stopMic(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(micSrc){try{micSrc.disconnect()}catch(e){}micSrc=null}$('start').disabled=false;$('stop').disabled=true;setMsg('Microphone stopped')}

function connectMusic(){
  if(!A||musicConnected)return;
  const audio=$('audio');
  try{musicSrc=A.createMediaElementSource(audio);musicSrc.connect(mu);musicConnected=true}catch(e){console.error(e);}
}
async function playMusic(){
  try{
    await initAudio(); connectMusic();
    if($('audio').paused) await $('audio').play();
  }catch(e){console.error(e);setMsg('❌ Song could not play: '+e.message)}
}

$('start').onclick=startMic;$('stop').onclick=stopMic;
$('file').onchange=async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  if(objectUrl)URL.revokeObjectURL(objectUrl); objectUrl=URL.createObjectURL(f);
  $('audio').src=objectUrl;$('song').textContent='🎵 '+f.name;$('audio').load();
  try{await initAudio();connectMusic();setMsg('Song ready. Press ▶ Play on the audio player.')}catch(err){setMsg('Song selected. Browser audio is available; '+err.message)}
};
$('audio').addEventListener('play',async()=>{try{await initAudio();connectMusic();if(A.state==='suspended')await A.resume();}catch(e){console.error(e);setMsg('❌ Audio engine: '+e.message)}});

function range(id,out,fn,apply){$(id).oninput=()=>{const v=+$(id).value;$(out).textContent=fn(v);if(apply)apply(v)};$(id).oninput()}
range('music','mv',v=>v+'%',v=>{if(mu)mu.gain.value=v/100});
range('micvol','micv',v=>v+'%',v=>{if(mg)mg.gain.value=v/100});
range('echo','ev',v=>v+'%',v=>{if(echo){echo.gain.value=v/100;fb.gain.value=Math.min(.75,v/100)}});
range('reverb','rv',v=>v+'%',v=>{if(reverb)reverb.gain.value=v/100});
range('delay','dv',v=>v+' ms',v=>{if(delay)delay.delayTime.value=v/1000});
range('master','masterv',v=>v+'%',v=>{if(master)master.gain.value=v/100});
$('voice').onchange=()=>{if(!filter)return;const v=$('voice').value;filter.gain.value=0;filter.Q.value=1;
 if(v==='deep'){filter.type='lowpass';filter.frequency.value=1800}else if(v==='bright'){filter.type='highshelf';filter.frequency.value=1800;filter.gain.value=8}else if(v==='radio'){filter.type='bandpass';filter.frequency.value=1400;filter.Q.value=1.2}else if(v==='telephone'){filter.type='bandpass';filter.frequency.value=1100;filter.Q.value=2.2}else if(v==='robot'){filter.type='peaking';filter.frequency.value=850;filter.Q.value=6;filter.gain.value=13}else{filter.type='allpass'}};

function draw(){const c=$('meter'),g=c.getContext('2d'),d=new Uint8Array(1024);(function f(){requestAnimationFrame(f);if(!analyser)return;analyser.getByteTimeDomainData(d);g.clearRect(0,0,c.width,c.height);let s=0;for(const x of d){const z=(x-128)/128;s+=z*z}const l=Math.min(1,Math.sqrt(s/d.length)*4);g.fillStyle='#22d3ee';g.fillRect(0,0,c.width*l,c.height)})()}
function net(){$('net').textContent=navigator.onLine?'ONLINE':'OFFLINE READY'}
addEventListener('online',net);addEventListener('offline',net);net();
if(location.protocol==='file:')$('pwaText').textContent='⚠️ You opened the downloaded HTML directly. Music may play, but microphone/PWA service worker require the HTTPS GitHub Pages website.';
let ip;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e;$('install').hidden=false});$('install').onclick=async()=>{if(!ip)return;ip.prompt();try{await ip.userChoice}catch(e){}ip=null;$('install').hidden=true};
if('serviceWorker' in navigator && location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));
