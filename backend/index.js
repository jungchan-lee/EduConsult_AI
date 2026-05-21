// ================================
// 1. 기본 세팅
// ================================
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("PDF 파일만 업로드할 수 있습니다."));
    }
    cb(null, true);
  },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));


// ================================
// 2. DB 연결
// ================================
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "student_matching",
  password: "84512768",
  port: 5432,
});


// ================================
// 3. 테스트 API
// ================================
app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("DB 연결 실패");
  }
});


// ================================
// 4. 학생 저장 API
// 👉 최초 생성 / 수정 겸용 가능
// ================================
app.post("/students/save", async (req, res) => {
  const {
    id, // 있으면 update
    name,
    phone,
    grade,
    parent_phone,
    gender,
    school_type,
    high_school,
    address,
    contact_preference,
    email,

    survey_json,
    interview_json
  } = req.body;

  try {
    let result;

    // 🔥 기존 데이터 있으면 UPDATE
    if (id) {
      result = await pool.query(`
        UPDATE students SET
          name = $1,
          phone = $2,
          grade = $3,
          parent_phone = $4,
          gender = $5,
          school_type = $6,
          high_school = $7,
          address = $8,
          contact_preference = $9,
          email = $10,

          survey_json = $11,
          interview_json = $12,

          updated_at = NOW()
        WHERE id = $13
        RETURNING *
      `, [
        name,
        phone,
        grade,
        parent_phone,
        gender,
        school_type,
        high_school,
        address,
        contact_preference,
        email,

        survey_json,
        interview_json,

        id
      ]);

    } else {
      // 🔥 신규 생성
      result = await pool.query(`
        INSERT INTO students (
          name,
          phone,
          grade,
          parent_phone,
          gender,
          school_type,
          high_school,
          address,
          contact_preference,
          email,

          survey_json,
          interview_json,

          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,
          'submitted'
        )
        RETURNING *
      `, [
        name,
        phone,
        grade,
        parent_phone,
        gender,
        school_type,
        high_school,
        address,
        contact_preference,
        email,

        survey_json,
        interview_json
      ]);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("학생 저장 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});


// ================================
// 5. 파일 URL 저장 API
// ================================
app.post("/students/upload", upload.single("file"), async (req, res) => {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id가 필요합니다." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "업로드할 PDF 파일이 필요합니다." });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    await pool.query(`
      UPDATE students
      SET self_intro_file_url = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [fileUrl, student_id]);

    res.json({ message: "파일 저장 완료", file_url: fileUrl });

  } catch (err) {
    console.error("파일 저장 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});


// ================================
// 6. 학생 제출 + 추천 요청 생성
// ================================
app.post("/students/submit", async (req, res) => {
  const { student_id, instruction_text } = req.body;

  try {
    // 상태 변경
    await pool.query(`
      UPDATE students
      SET status = 'reviewing',
          updated_at = NOW()
      WHERE id = $1
    `, [student_id]);

    // 추천 세션 생성
    const session = await pool.query(`
      INSERT INTO recommendation_sessions
      (student_id, instruction_text, status)
      VALUES ($1, $2, 'pending')
      RETURNING *
    `, [student_id, instruction_text]);

    res.json(session.rows[0]);

  } catch (err) {
    console.error("제출 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});


// ================================
// 7. 추천 리스??조회
// ================================
app.get("/recommendations/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        s.id AS student_id,
        s.name AS student_name,

        rs.id AS session_id,
        rs.status AS session_status,
        rs.instruction_text,

        t.id AS teacher_id,
        t.name AS teacher_name,
        t.university,
        t.major,

        r.score,
        r.reason,
        r.selected

      FROM recommendations r
      JOIN recommendation_sessions rs ON r.session_id = rs.id
      JOIN students s ON rs.student_id = s.id
      JOIN teachers t ON r.teacher_id = t.id

      WHERE s.id = $1
      ORDER BY r.score DESC
    `, [studentId]);

    res.json(result.rows);

  } catch (err) {
    console.error("추천 조회 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});


// ================================
// 8. 추천 선택 API
// ================================
app.post("/recommendations/select", async (req, res) => {
  const { sessionId, teacherId } = req.body;

  try {
    await pool.query(`
      UPDATE recommendations
      SET selected = false
      WHERE session_id = $1
    `, [sessionId]);

    await pool.query(`
      UPDATE recommendations
      SET selected = true
      WHERE session_id = $1 AND teacher_id = $2
    `, [sessionId, teacherId]);

    await pool.query(`
      UPDATE recommendation_sessions
      SET final_teacher_id = $1,
          status = 'approved'
      WHERE id = $2
    `, [teacherId, sessionId]);

    res.json({ message: "✅ 최종 선택 완료" });

  } catch (err) {
    console.error("선택 처리 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});


// ================================
// 9. 서버 실행
// ================================
app.listen(3001, () => {
  console.log("✅ 서버 실행됨: http://localhost:3001");
});

