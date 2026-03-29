-- เชื่อม variant กับค่าคุณสมบัติ (attributevalues) สำหรับหน้าเปรียบเทียบ
-- ตาราง attributevalues / attributes มีอยู่แล้วตาม schema ของคุณ
-- รันเมื่อยังไม่มีตารางเชื่อม (ถ้ามีแล้วและชื่อคอลัมน์ตรง ไม่ต้องรัน)

CREATE TABLE IF NOT EXISTS variantattributevalues (
  variantid INTEGER NOT NULL REFERENCES productvariants (variantid) ON DELETE CASCADE,
  attributevalueid INTEGER NOT NULL REFERENCES attributevalues (attributevalueid) ON DELETE CASCADE,
  PRIMARY KEY (variantid, attributevalueid)
);

CREATE INDEX IF NOT EXISTS idx_variantattributevalues_attributevalueid
  ON variantattributevalues (attributevalueid);
