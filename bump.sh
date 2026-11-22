#!/bin/sh
# ใส่เลขเวอร์ชันใหม่ให้ไฟล์ .js/.css ที่ใช้ร่วมกัน เพื่อไม่ให้ browser ใช้ไฟล์เก่าที่จำไว้ (รันก่อน commit ทุกครั้ง)
v=$(date +%Y%m%d%H%M)
sed -i -E "s/(config\.js|form-sheet\.js|form-sheet\.css)(\?v=[0-9A-Za-z]+)?\"/\1?v=$v\"/g" index.html staff.html templates.html qr.html
echo "version $v"
