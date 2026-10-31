// Рендер: node render.cjs video  → votsuev-promo.mp4 (все кадры i/60 + WAV)
//         node render.cjs stills t1 t2 ... → PNG-кадры для проверки
const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
(async()=>{
  const mode=process.argv[2]||'video',dir=__dirname;
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1920,height:1080}});
  pg.on('pageerror',e=>{console.error('PAGE ERROR',e.stack);process.exit(1)});
  await pg.goto('file://'+path.join(dir,'votsuev-promo.html')+'?render=1');
  await pg.evaluate(async()=>{await document.fonts.load("600 80px 'Inter Display'");await document.fonts.load("16px 'JetBrains Mono'");await document.fonts.ready;renderAt(0)});
  const grab=t=>pg.evaluate(t=>{renderAt(t);return document.getElementById('c').toDataURL('image/png').slice(22)},t);
  if(mode==='stills'){const out=process.argv[3];fs.mkdirSync(out,{recursive:true});
    for(const t of process.argv.slice(4).map(Number))fs.writeFileSync(path.join(out,`t${t.toFixed(2)}.png`),Buffer.from(await grab(t),'base64'));}
  else{const N=22*60,ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','60','-c:v','png','-i','-','-i',path.join(dir,'votsuev-promo.wav'),
      '-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-r','60','-c:a','aac','-b:a','256k','-movflags','+faststart',path.join(dir,'votsuev-promo.mp4')],{stdio:['pipe','inherit','inherit']});
    for(let i=0;i<N;i++){const buf=Buffer.from(await grab(i/60),'base64');if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%120===0)console.log('frame',i)}
    ff.stdin.end();await new Promise(r=>ff.on('close',r));}
  await b.close();
})();
