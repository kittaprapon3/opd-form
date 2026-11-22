/* แบบขอมีเวชระเบียนผู้ป่วยนอก FM-NMD-OPD-01-R02-01-67
   ตำแหน่งข้อมูลบนหน้า 12 ต้นฉบับ (หน่วย pt, A4 595.22 × 842) — ใช้ร่วมกันทั้งหน้าคนไข้และหน้าเจ้าหน้าที่ */
(function(){
const esc=s=>(s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const thDate=d=>{if(!d)return '';const x=new Date(d);return isNaN(x)?'':x.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});};
const FormSheet={
  BG:'form-bg.png', esc, thDate,
  layout(o,now,unitName){
  const it=[], T=(x1,x2,top,val,fs)=>{ if(val) it.push({k:'t',x1,x2,top,val:String(val),fs:fs||11.5}); },
        C=(x,y,on)=>{ if(on&&x!=null) it.push({k:'c',x,y}); };
  const ID_X=[139.7,169.0,186.7,204.0,221.3,254.9,272.2,289.4,306.7,324.0,350.9,368.6,385.9];
  const MAR={โสด:89.8,คู่:122.9,หม้าย:152.6,หย่า:195.8,สมณะ:236.2};
  const BLD={เอ:93.6,บี:135.8,เอบี:174.2,โอ:216.5,ไม่ทราบ:259.2};
  const RH={บวก:369.6,ลบ:415.2,ไม่ทราบ:457.4};
  const ALG={'ไม่มีประวัติแพ้':93.6,'ไม่ทราบ':171.4,'แพ้':228.0};
  T(442,588,89.9,unitName);
  T(92,205,135.5,o.hn);   // NMD HN (เจ้าหน้าที่กรอก)
  T(449,507,121.5,now.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}));
  T(535,583,121.5,now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));
  T(101,300,166.5,o.fullname); T(315,375,166.5,o.sex); T(390,432,166.5,o.age); T(498,566,166.5,thDate(o.dob),10.5);
  T(77,275,182.5,o.unit); T(297,438,182.5,o.occupation); T(464,566,182.5,o.religion);
  C(MAR[o.marital],202.6,o.marital);
  [...(o.cid||'').replace(/\D/g,'')].forEach((ch,i)=>{ if(ID_X[i]!=null) it.push({k:'d',x:ID_X[i],y:212,val:ch}); });
  T(129,332,230.5,o.goldcard); T(439,566,230.5,o.conscript);
  T(183,254,246.4,o.a_no); T(266,300,246.4,o.a_moo); T(317,431,246.4,o.a_soi); T(448,566,246.4,o.a_road);
  T(78,233,262.5,o.a_tambon); T(257,389,262.5,o.a_amphoe); T(414,566,262.5,o.a_prov);
  T(271.5,325,278.5,o.c_no); T(336.5,374.6,278.5,o.c_moo); T(390.6,452.6,278.5,o.c_soi); T(469.7,566,278.5,o.c_road);
  T(78,176,294.4,o.c_tambon); T(200,289.6,294.4,o.c_amphoe); T(315,431,294.4,o.c_prov); T(463,566,294.4,o.phone);
  C(BLD[o.blood],314.4,o.blood); C(RH[o.rh],314.4,o.rh); C(ALG[o.allergy],330.2,o.allergy);
  if(o.allergy==='แพ้'){ T(316,417,326.5,o.drug); T(459,566,326.5,o.reaction); }
  T(105,566,342.4,o.disease);
  T(138,353,358.5,o.ec_name); T(401,566,358.5,o.ec_rel);
  T(130,403,374.5,o.ec_addr); T(435.5,566,374.5,o.ec_phone);
  if(o.signature) it.push({k:'s',x:226,y:589,w:117,h:25,src:o.signature});
  T(472,560,599.2,o.signerRole==='ผู้ให้ข้อมูล'?o.signerRel:'ตนเอง');
  return it;
},
  html(items){
    return items.map(x=>
      x.k==='t'?`<div class="v" style="left:${x.x1}pt;width:${x.x2-x.x1}pt;top:${x.top}pt;font-size:${x.fs}pt">${esc(x.val)}</div>`:
      x.k==='f'?`<div class="ft" style="left:${x.x1}pt;width:${x.x2-x.x1}pt;top:${x.top}pt;font-size:${x.fs}pt">${esc(x.val)}</div>`:
      x.k==='c'?`<div class="ck" style="left:${x.x}pt;top:${x.y}pt">✓</div>`:
      x.k==='d'?`<div class="idc" style="left:${x.x}pt;top:${x.y}pt">${esc(x.val)}</div>`:
      `<img class="sigimg" src="${esc(x.src)}" style="left:${x.x}pt;width:${x.w}pt;top:${x.y}pt;height:${x.h}pt">`).join('');
  },
  /* ย่อแบบฟอร์มให้พอดีความกว้าง maxW (px) */
  fit(wrap, sheet, maxW){
    const W=595.22*96/72, H=842*96/72, k=Math.min(1,maxW/W);
    sheet.style.transform=`scale(${k})`; wrap.style.width=W*k+'px'; wrap.style.height=H*k+'px';
  },
  /* วาดแบบฟอร์มลง canvas 150 dpi แล้วคืนเป็นเอกสาร jsPDF */
  async pdf(items, bgSrc){
  const S=150/72, W=Math.round(595.22*S), H=Math.round(842*S), c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H);
  const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
  g.drawImage(await load(bgSrc||FormSheet.BG),0,0,W,H);
  try{ await document.fonts.load(`600 ${Math.round(12*S)}px Sarabun`); }catch(e){}
  g.fillStyle='#0a2a8a'; g.textBaseline='middle';
  for(const x of items){
    if(x.k==='t'){ g.save(); g.beginPath(); g.rect(x.x1*S,x.top*S,(x.x2-x.x1)*S,15*S); g.clip();
      g.font=`600 ${x.fs*S}px Sarabun, Tahoma, sans-serif`; g.fillText(x.val,(x.x1+3)*S,(x.top+7.8)*S); g.restore(); }
    else if(x.k==='f'){ g.save(); g.fillStyle='#222'; g.font=`400 ${x.fs*S}px Sarabun, Tahoma, sans-serif`; g.fillText(x.val,x.x1*S,(x.top+6)*S); g.fillStyle='#0a2a8a'; g.restore(); }
    else if(x.k==='c'){ g.font=`700 ${11*S}px Sarabun, sans-serif`; g.textAlign='center'; g.fillText('✓',(x.x+4.8)*S,(x.y+4.6)*S); g.textAlign='left'; }
    else if(x.k==='d'){ g.font=`700 ${12*S}px Sarabun, sans-serif`; g.textAlign='center'; g.fillText(x.val,(x.x+7.2)*S,(x.y+7.8)*S); g.textAlign='left'; }
    else if(x.k==='s'){ const im=await load(x.src), r=Math.min(x.w/im.width,x.h/im.height), w=im.width*r, h=im.height*r;
      g.drawImage(im,(x.x+(x.w-w)/2)*S,(x.y+(x.h-h)/2)*S,w*S,h*S); }
  }
  const pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'});
  pdf.addImage(c.toDataURL('image/jpeg',0.85),'JPEG',0,0,595.22,842);
  return pdf;
}
};
window.FormSheet=FormSheet;
})();
