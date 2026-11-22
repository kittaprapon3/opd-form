/* แบบขอมีเวชระเบียนผู้ป่วยนอก — วางข้อมูลลงบนภาพแบบฟอร์ม
   แบบฟอร์มเป็น "template" = ภาพพื้นหลัง + ตำแหน่งช่อง (หน่วย pt)  ใช้ร่วมกันทั้งหน้าคนไข้ / เจ้าหน้าที่ / จัดการแบบฟอร์ม */
(function(){
const esc=s=>(s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const thDate=d=>{if(!d)return '';const x=new Date(d);return isNaN(x)?'':x.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});};

/* ช่องข้อมูลทั้งหมดที่ระบบรู้จัก (ลำดับ = ลำดับในหน้าจัดการแบบฟอร์ม) */
const FIELD_DEFS=[
  {key:'unitName',  label:'ชื่อหน่วย (กรอบเจ้าหน้าที่)', type:'text'},
  {key:'date',      label:'วันเดือนปี (วันที่ส่ง)',       type:'text'},
  {key:'time',      label:'เวลา',                       type:'text'},
  {key:'hn',        label:'HN',                         type:'text'},
  {key:'fullname',  label:'ยศ-ชื่อ-สกุล',                type:'text'},
  {key:'sex',       label:'เพศ',                        type:'text'},
  {key:'age',       label:'อายุ',                       type:'text'},
  {key:'dob',       label:'วันเดือนปีเกิด',               type:'text'},
  {key:'unit',      label:'สังกัด',                      type:'text'},
  {key:'occupation',label:'อาชีพ',                      type:'text'},
  {key:'religion',  label:'ศาสนา',                      type:'text'},
  {key:'marital',   label:'สถานะ',                      type:'check', opts:['โสด','คู่','หม้าย','หย่า','สมณะ']},
  {key:'cid',       label:'เลขที่บัตรประชาชน',            type:'digits'},
  {key:'goldcard',  label:'บัตรทอง ท/R',                 type:'text'},
  {key:'conscript', label:'ผลัดที่/ปี',                   type:'text'},
  {key:'a_no',      label:'บ้านเลขที่ (ตามบัตร)',          type:'text'},
  {key:'a_moo',     label:'หมู่ (ตามบัตร)',                type:'text'},
  {key:'a_soi',     label:'ซอย (ตามบัตร)',                type:'text'},
  {key:'a_road',    label:'ถนน (ตามบัตร)',                type:'text'},
  {key:'a_tambon',  label:'ตำบล (ตามบัตร)',               type:'text'},
  {key:'a_amphoe',  label:'อำเภอ (ตามบัตร)',              type:'text'},
  {key:'a_prov',    label:'จังหวัด (ตามบัตร)',             type:'text'},
  {key:'c_no',      label:'บ้านเลขที่ (ปัจจุบัน)',          type:'text'},
  {key:'c_moo',     label:'หมู่ (ปัจจุบัน)',                type:'text'},
  {key:'c_soi',     label:'ซอย (ปัจจุบัน)',                type:'text'},
  {key:'c_road',    label:'ถนน (ปัจจุบัน)',                type:'text'},
  {key:'c_tambon',  label:'ตำบล (ปัจจุบัน)',               type:'text'},
  {key:'c_amphoe',  label:'อำเภอ (ปัจจุบัน)',              type:'text'},
  {key:'c_prov',    label:'จังหวัด (ปัจจุบัน)',             type:'text'},
  {key:'phone',     label:'โทรศัพท์',                     type:'text'},
  {key:'blood',     label:'หมู่เลือด',                    type:'check', opts:['เอ','บี','เอบี','โอ','ไม่ทราบ']},
  {key:'rh',        label:'Rh',                         type:'check', opts:['บวก','ลบ','ไม่ทราบ']},
  {key:'allergy',   label:'แพ้ยา',                       type:'check', opts:['ไม่มีประวัติแพ้','ไม่ทราบ','แพ้']},
  {key:'drug',      label:'ชื่อยาที่แพ้',                  type:'text'},
  {key:'reaction',  label:'อาการที่แพ้',                  type:'text'},
  {key:'disease',   label:'โรคประจำตัว',                  type:'text'},
  {key:'ec_name',   label:'ผู้ติดต่อ ชื่อ-สกุล',             type:'text'},
  {key:'ec_rel',    label:'ผู้ติดต่อ เกี่ยวข้องเป็น',          type:'text'},
  {key:'ec_addr',   label:'ผู้ติดต่อ ที่อยู่',               type:'text'},
  {key:'ec_phone',  label:'ผู้ติดต่อ เบอร์โทร',             type:'text'},
  {key:'signature', label:'ลายเซ็น',                     type:'sig'},
  {key:'signerRel', label:'ความสัมพันธ์เป็น',              type:'text'},
];

/* แบบฟอร์มต้นฉบับในระบบ: FM-NMD-OPD-01-R02-01-67 (หน้า 12) */
const T=(key,x1,x2,top,fs)=>({key,type:'text',x1,x2,top,...(fs?{fs}:{})});
const BUILTIN={
  id:'builtin', name:'FM-NMD-OPD-01-R02-01-67 (ต้นฉบับในระบบ)', bg:'form-bg.png', w:595.22, h:842,
  fields:[
    T('unitName',442,588,89.9), T('hn',92,205,135.5), T('date',449,507,121.5), T('time',535,583,121.5),
    T('fullname',101,300,166.5), T('sex',315,375,166.5), T('age',390,432,166.5), T('dob',498,566,166.5,10.5),
    T('unit',77,275,182.5), T('occupation',297,438,182.5), T('religion',464,566,182.5),
    {key:'marital',type:'check',opts:{โสด:[89.8,202.6],คู่:[122.9,202.6],หม้าย:[152.6,202.6],หย่า:[195.8,202.6],สมณะ:[236.2,202.6]}},
    {key:'cid',type:'digits',y:212,xs:[139.7,169.0,186.7,204.0,221.3,254.9,272.2,289.4,306.7,324.0,350.9,368.6,385.9]},
    T('goldcard',129,332,230.5), T('conscript',439,566,230.5),
    T('a_no',183,254,246.4), T('a_moo',266,300,246.4), T('a_soi',317,431,246.4), T('a_road',448,566,246.4),
    T('a_tambon',78,233,262.5), T('a_amphoe',257,389,262.5), T('a_prov',414,566,262.5),
    T('c_no',271.5,325,278.5), T('c_moo',336.5,374.6,278.5), T('c_soi',390.6,452.6,278.5), T('c_road',469.7,566,278.5),
    T('c_tambon',78,176,294.4), T('c_amphoe',200,289.6,294.4), T('c_prov',315,431,294.4), T('phone',463,566,294.4),
    {key:'blood',type:'check',opts:{เอ:[93.6,314.4],บี:[135.8,314.4],เอบี:[174.2,314.4],โอ:[216.5,314.4],ไม่ทราบ:[259.2,314.4]}},
    {key:'rh',type:'check',opts:{บวก:[369.6,314.4],ลบ:[415.2,314.4],ไม่ทราบ:[457.4,314.4]}},
    {key:'allergy',type:'check',opts:{'ไม่มีประวัติแพ้':[93.6,330.2],'ไม่ทราบ':[171.4,330.2],'แพ้':[228.0,330.2]}},
    T('drug',316,417,326.5), T('reaction',459,566,326.5), T('disease',105,566,342.4),
    T('ec_name',138,353,358.5), T('ec_rel',401,566,358.5), T('ec_addr',130,403,374.5), T('ec_phone',435.5,566,374.5),
    {key:'signature',type:'sig',x:226,y:589,w:117,h:25},
    T('signerRel',472,560,599.2),
  ]
};

/* ค่าที่จะพิมพ์ในแต่ละช่อง */
function values(o,now,unitName){
  const v={...o};
  v.unitName=unitName||'';
  v.date=now.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  v.time=now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  v.dob=thDate(o.dob);
  v.cid=(o.cid||'').replace(/\D/g,'');
  if(o.allergy!=='แพ้'){ v.drug=''; v.reaction=''; }
  v.signerRel=o.signerRole==='ผู้ให้ข้อมูล'?(o.signerRel||''):'ตนเอง';
  return v;
}

const FormSheet={
  BG:'form-bg.png', BUILTIN, FIELD_DEFS, esc, thDate, values,
  /* แปลงข้อมูล o เป็นรายการสิ่งที่จะวาด ตาม template */
  layout(o,now,unitName,tpl){
    tpl=tpl||BUILTIN; const v=values(o,now,unitName), it=[];
    for(const f of tpl.fields||[]){
      const val=v[f.key];
      if(f.type==='text'){ if(val!=null&&val!=='') it.push({k:'t',x1:f.x1,x2:f.x2,top:f.top,val:String(val),fs:f.fs||11.5}); }
      else if(f.type==='check'){ const p=f.opts&&f.opts[val]; if(p) it.push({k:'c',x:p[0],y:p[1]}); }
      else if(f.type==='digits'){ [...(val||'')].forEach((ch,i)=>{ if(f.xs[i]!=null) it.push({k:'d',x:f.xs[i],y:f.y,val:ch}); }); }
      else if(f.type==='sig'){ if(o.signature) it.push({k:'s',x:f.x,y:f.y,w:f.w,h:f.h,src:o.signature}); }
    }
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
  /* ตั้งภาพพื้นหลังและขนาดของ .sheet ตาม template */
  mount(sheet,tpl){
    tpl=tpl||BUILTIN; sheet.style.width=tpl.w+'pt'; sheet.style.height=tpl.h+'pt';
    const img=sheet.querySelector('img'); if(img&&img.getAttribute('src')!==tpl.bg) img.src=tpl.bg;
    sheet.dataset.w=tpl.w; sheet.dataset.h=tpl.h;
    let st=document.getElementById('pageSizeStyle'); if(!st){ st=document.createElement('style'); st.id='pageSizeStyle'; document.head.appendChild(st); }
    st.textContent=`@media print{@page{size:${tpl.w}pt ${tpl.h}pt;margin:0}}`;
  },
  /* ย่อแบบฟอร์มให้พอดีความกว้าง maxW (px) */
  fit(wrap, sheet, maxW){
    const W=(+sheet.dataset.w||595.22)*96/72, H=(+sheet.dataset.h||842)*96/72, k=Math.min(1,maxW/W);
    sheet.style.transform=`scale(${k})`; wrap.style.width=W*k+'px'; wrap.style.height=H*k+'px';
  },
  /* วาดแบบฟอร์มลง canvas 150 dpi แล้วคืนเป็นเอกสาร jsPDF */
  async pdf(items, bgSrc, tpl){
    tpl=tpl||BUILTIN;
    const S=150/72, W=Math.round(tpl.w*S), H=Math.round(tpl.h*S), c=document.createElement('canvas'); c.width=W; c.height=H;
    const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H);
    const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
    g.drawImage(await load(bgSrc||tpl.bg),0,0,W,H);
    try{ await document.fonts.load(`600 ${Math.round(12*S)}px Sarabun`); }catch(e){}
    g.fillStyle='#0a2a8a'; g.textBaseline='middle';
    for(const x of items){
      if(x.k==='t'){ g.save(); g.beginPath(); g.rect(x.x1*S,x.top*S,(x.x2-x.x1)*S,15*S); g.clip();
        g.font=`600 ${x.fs*S}px Sarabun, Tahoma, sans-serif`; g.fillText(x.val,(x.x1+3)*S,(x.top+7.8)*S); g.restore(); }
      else if(x.k==='f'){ g.save(); g.fillStyle='#222'; g.font=`400 ${x.fs*S}px Sarabun, Tahoma, sans-serif`; g.fillText(x.val,x.x1*S,(x.top+6)*S); g.restore(); }
      else if(x.k==='c'){ g.font=`700 ${11*S}px Sarabun, sans-serif`; g.textAlign='center'; g.fillText('✓',(x.x+4.8)*S,(x.y+4.6)*S); g.textAlign='left'; }
      else if(x.k==='d'){ g.font=`700 ${12*S}px Sarabun, sans-serif`; g.textAlign='center'; g.fillText(x.val,(x.x+7.2)*S,(x.y+7.8)*S); g.textAlign='left'; }
      else if(x.k==='s'){ const im=await load(x.src), r=Math.min(x.w/im.width,x.h/im.height), w=im.width*r, h=im.height*r;
        g.drawImage(im,(x.x+(x.w-w)/2)*S,(x.y+(x.h-h)/2)*S,w*S,h*S); }
    }
    const pdf=new window.jspdf.jsPDF({unit:'pt',format:[tpl.w,tpl.h],orientation:tpl.w>tpl.h?'l':'p'});
    pdf.addImage(c.toDataURL('image/jpeg',0.85),'JPEG',0,0,tpl.w,tpl.h);
    return pdf;
  },
  /* โหลด template จาก Supabase (null/builtin = ต้นฉบับในระบบ) */
  _cache:{},
  async loadTemplate(sb,id){
    if(!sb||!id||id==='builtin') return BUILTIN;
    if(this._cache[id]) return this._cache[id];
    const {data,error}=await sb.from('form_templates').select('id,name,bg,fields,width_pt,height_pt').eq('id',id).maybeSingle();
    if(error||!data) return BUILTIN;
    return this._cache[id]={id:data.id,name:data.name,bg:data.bg,fields:data.fields,w:+data.width_pt,h:+data.height_pt};
  },
  async loadActive(sb){
    if(!sb) return BUILTIN;
    try{
      const {data}=await sb.from('form_templates').select('id,name,bg,fields,width_pt,height_pt').eq('is_active',true).maybeSingle();
      if(data) return this._cache[data.id]={id:data.id,name:data.name,bg:data.bg,fields:data.fields,w:+data.width_pt,h:+data.height_pt};
    }catch(e){}
    return BUILTIN;
  }
};
window.FormSheet=FormSheet;
})();
