/**
 * แบบขอมีเวชระเบียนผู้ป่วยนอก (ออนไลน์) — ฝั่งรับข้อมูล (Google Apps Script)
 * หน้าเว็บอยู่บน GitHub Pages แล้วส่งข้อมูลมาที่ doPost ของสคริปต์นี้
 *
 *  - บันทึกลงชีต "คำขอเวชระเบียน" ในสเปรดชีตที่ผูกกับสคริปต์
 *  - เก็บ PDF แบบฟอร์มที่กรอกแล้ว (มีลายเซ็น) ในโฟลเดอร์ Google Drive
 */
const SHEET_NAME   = 'คำขอเวชระเบียน';
const FOLDER_NAME  = 'แบบขอมีเวชระเบียน (PDF)';
const MAX_PER_MIN  = 30;          // จำกัดจำนวนคำขอต่อนาที (กันการยิงข้อมูลมั่ว)
const MAX_PDF_B64  = 4 * 1024 * 1024;

const COLUMNS = [
  ['ref','เลขที่คำขอ'],['ts','วันเวลาที่ส่ง'],['status','สถานะ'],['hn','HN'],
  ['rank','ยศ/คำนำหน้า'],['fname','ชื่อ'],['lname','นามสกุล'],['fullname','ยศ-ชื่อ-สกุล'],
  ['sex','เพศ'],['dob','วันเกิด'],['age','อายุ'],['cid','เลขบัตรประชาชน'],
  ['unit','สังกัด'],['occupation','อาชีพ'],['religion','ศาสนา'],['marital','สถานะสมรส'],
  ['goldcard','บัตรทอง ท/R'],['conscript','ผลัด/ปี'],
  ['a_no','บ้านเลขที่'],['a_moo','หมู่'],['a_soi','ซอย'],['a_road','ถนน'],['a_tambon','ตำบล'],['a_amphoe','อำเภอ'],['a_prov','จังหวัด'],
  ['c_no','ปัจจุบัน-บ้านเลขที่'],['c_moo','ปัจจุบัน-หมู่'],['c_soi','ปัจจุบัน-ซอย'],['c_road','ปัจจุบัน-ถนน'],['c_tambon','ปัจจุบัน-ตำบล'],['c_amphoe','ปัจจุบัน-อำเภอ'],['c_prov','ปัจจุบัน-จังหวัด'],
  ['phone','โทรศัพท์'],['blood','หมู่เลือด'],['rh','Rh'],['allergy','แพ้ยา'],['drug','ยาที่แพ้'],['reaction','อาการที่แพ้'],['disease','โรคประจำตัว'],
  ['ec_name','ผู้ติดต่อ'],['ec_rel','เกี่ยวข้องเป็น'],['ec_addr','ที่อยู่ผู้ติดต่อ'],['ec_phone','เบอร์ผู้ติดต่อ'],
  ['signerRole','ผู้ลงชื่อ'],['signerRel','ความสัมพันธ์'],['pdf','ไฟล์แบบฟอร์ม (PDF)']
];

function doGet() {
  return json_({ ok: true, service: 'opd-record-request' });
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(submitRequest_(d));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function submitRequest_(d) {
  // ---- ตรวจข้อมูล ----
  const cid = String(d.cid || '').replace(/\D/g, '');
  if (!validCID_(cid)) throw new Error('เลขบัตรประชาชนไม่ถูกต้อง');
  if (!d.fname || !d.lname) throw new Error('กรุณากรอกชื่อ-นามสกุล');
  if (!d.phone) throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  if (!d.signature || String(d.signature).indexOf('data:image/png;base64,') !== 0) throw new Error('ไม่พบลายเซ็น');
  if (!d.pdf || String(d.pdf).length > MAX_PDF_B64) throw new Error('ไฟล์แบบฟอร์มไม่ถูกต้อง');
  const pdfBytes = Utilities.base64Decode(d.pdf);
  if (Utilities.newBlob(pdfBytes.slice(0, 5)).getDataAsString() !== '%PDF-') throw new Error('ไฟล์แบบฟอร์มไม่ถูกต้อง');

  // ---- จำกัดอัตรา ----
  const cache = CacheService.getScriptCache();
  const mk = 'rate_' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(mk) || 0) + 1;
  cache.put(mk, String(n), 120);
  if (n > MAX_PER_MIN) throw new Error('มีผู้ใช้งานจำนวนมาก กรุณาลองใหม่ในอีกสักครู่');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_();
    const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
    const now = new Date();
    const ymd = Utilities.formatDate(now, tz, 'yyMMdd');
    const props = PropertiesService.getScriptProperties();
    const key = 'seq_' + ymd, seq = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(seq));
    const ref = ymd + '-' + ('000' + seq).slice(-3);

    const name = ref + '_' + clean_(d.fname, 40) + '_' + clean_(d.lname, 40) + '.pdf';
    const file = getFolder_().createFile(Utilities.newBlob(pdfBytes, 'application/pdf', name));

    const row = COLUMNS.map(function (c) {
      const k = c[0];
      if (k === 'ref') return ref;
      if (k === 'ts') return now;
      if (k === 'status') return 'รอดำเนินการ';
      if (k === 'hn') return '';
      if (k === 'cid') return "'" + cid;
      if (k === 'pdf') return file.getUrl();
      const v = clean_(d[k], 300);
      return v ? "'" + v : '';          // บังคับเป็นข้อความ กันสูตร (=, +, -) ในชีต
    });
    sh.appendRow(row);
    return { ok: true, ref: ref };
  } finally {
    lock.releaseLock();
  }
}

function clean_(v, max) {
  return (v == null ? '' : String(v)).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function validCID_(d) {
  if (!/^\d{13}$/.test(d)) return false;
  let t = 0;
  for (let i = 0; i < 12; i++) t += Number(d[i]) * (13 - i);
  return (11 - t % 11) % 10 === Number(d[12]);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#0b2e59').setFontColor('#ffffff');
    sh.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(['รอดำเนินการ', 'ออก HN แล้ว', 'ข้อมูลไม่ครบ/ติดต่อกลับ', 'ยกเลิก'], true).build());
  }
  return sh;
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/** รันครั้งแรกจากหน้าแก้ไขสคริปต์ เพื่ออนุญาตสิทธิ์และสร้างชีต/โฟลเดอร์ */
function setup() {
  getSheet_(); getFolder_();
  Logger.log('พร้อมใช้งาน: ชีต "%s" และโฟลเดอร์ "%s"', SHEET_NAME, FOLDER_NAME);
}
