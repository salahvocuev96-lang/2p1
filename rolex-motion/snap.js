// node snap.js out_dir t1 t2 ... — быстрые кадры-пробы
const {chromium}=require('playwright');const path=require('path');
(async()=>{
  const [out,...ts]=process.argv.slice(2);
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('console',m=>console.log('console:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve(__dirname,'index.html')+'?render');
  await p.waitForFunction(()=>window.READY);
  for(const t of ts){const t0=Date.now();
    const d=await p.evaluate(t=>{renderAt(+t);return document.getElementById('c').toDataURL('image/jpeg',.9)},t);
    require('fs').writeFileSync(`${out}/f_${(+t).toFixed(2)}.jpg`,Buffer.from(d.split(',')[1],'base64'));console.log(t,Date.now()-t0,'ms')}
  await b.close();
})();
