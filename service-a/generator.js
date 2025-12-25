const fetch = (...args) => import('node-fetch').then(({default:fn})=>fn(...args));
const pLimit = require('p-limit');
const argv = require('process').argv;

function parseArg(name, def){
  const idx = argv.indexOf(`--${name}`);
  if(idx!==-1 && argv[idx+1]) return argv[idx+1];
  return def;
}

const HOST = parseArg('host','http://localhost:3000');
const genre = parseArg('genre','Sci-Fi');
const requests = parseInt(parseArg('requests', '100'),10);
const concurrency = parseInt(parseArg('concurrency','10'),10);
const limit = parseInt(parseArg('limit','5'),10);

async function single(){
  const t0 = Date.now();
  try{
    const r = await fetch(`${HOST}/recommendations?genre=${encodeURIComponent(genre)}&limit=${limit}`);
    const end = Date.now();
    const json = await r.json();
    return {ok:r.ok, status:r.status, ms:end-t0, count: (json.result||[]).length};
  }catch(e){
    return {ok:false, status:0, ms:Date.now()-t0};
  }
}

(async ()=>{
  const limitP = pLimit(concurrency);
  const tasks = [];
  for(let i=0;i<requests;i++) tasks.push(limitP(()=>single()));
  const results = await Promise.all(tasks);
  const ok = results.filter(r=>r.ok).length;
  const latencies = results.map(r=>r.ms).sort((a,b)=>a-b);
  const avg = latencies.reduce((s,x)=>s+x,0)/latencies.length;
  const p95 = latencies[Math.floor(latencies.length*0.95)]||0;
  const p50 = latencies[Math.floor(latencies.length*0.5)]||0;
  console.log('host',HOST,'genre',genre,'requests',requests,'concurrency',concurrency,'limit',limit);
  console.log('successful',ok,'/',results.length);
  console.log('avg_ms',Math.round(avg),'p50',p50,'p95',p95);
  process.exit(0);
})();
