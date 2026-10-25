// node render.js out.mp4 [workers] — рендер всех кадров 0..DUR*FPS-1 и сборка видео (без звука)
const {chromium}=require('playwright');const path=require('path');const {spawn}=require('child_process');const fs=require('fs');
const FPS=60,DUR=52,N=FPS*DUR;
(async()=>{
  const out=process.argv[2]||'video.mp4', workers=+(process.argv[3]||4);
  const tmpdir=path.dirname(path.resolve(out));
  const b=await chromium.launch();
  const chunk=Math.ceil(N/workers);
  const t0=Date.now();
  const parts=await Promise.all([...Array(workers)].map(async(_,w)=>{
    const p=await b.newPage({viewport:{width:1920,height:1080}});
    p.on('pageerror',e=>console.log('ERR',e.message));
    await p.goto('file://'+path.resolve(__dirname,'index.html')+'?render');
    await p.waitForFunction(()=>window.READY);
    if(w===0)fs.writeFileSync(path.join(__dirname,'timeline.json'),JSON.stringify(await p.evaluate(()=>window.TIMELINE),null,1));
    const f0=w*chunk,f1=Math.min(N,f0+chunk),file=path.join(tmpdir,`chunk_${w}.mp4`);
    const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-',
      '-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-r',String(FPS),file],{stdio:['pipe','inherit','inherit']});
    for(let f=f0;f<f1;f++){
      const d=await p.evaluate(f=>{renderAt(f/60);return document.getElementById('c').toDataURL('image/png')},f);
      const buf=Buffer.from(d.slice(22),'base64');
      if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
      if(f%120===0)console.log(`w${w} frame ${f} (${((Date.now()-t0)/1000).toFixed(0)}s)`);
    }
    ff.stdin.end();await new Promise(r=>ff.on('close',r));
    return file;
  }));
  await b.close();
  fs.writeFileSync(path.join(tmpdir,'list.txt'),parts.map(f=>`file '${f}'`).join('\n'));
  await new Promise(r=>spawn('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(tmpdir,'list.txt'),'-c','copy',out],{stdio:'inherit'}).on('close',r));
  console.log('done',out,((Date.now()-t0)/1000).toFixed(0)+'s');
})();
