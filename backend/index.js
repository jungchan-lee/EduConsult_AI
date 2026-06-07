// ================================
// 1. 기본 세팅
// ================================
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

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
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg"
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("지원하지 않는 파일 형식입니다. (PDF, DOCX, 이미지 파일만 가능)"));
    }
    cb(null, true);
  },
});

// ================================
// OCR 처리 (DocForge) 함수
// ================================
function runDocForge(inputFilePath) {
  return new Promise((resolve, reject) => {
    const exePath = path.join(__dirname, "docforge", "DocumentEngine.exe");
    const outputJsonPath = inputFilePath + ".json";

    console.log("--- DocForge OCR 분석 시작 ---");
    console.log("Input:", inputFilePath);

    execFile(
      exePath,
      [inputFilePath, outputJsonPath],
      { cwd: path.dirname(exePath) },
      (error, stdout, stderr) => {
        if (error) {
          console.error("DocForge 실행 실패:", error);
          return reject(error);
        }

        if (!fs.existsSync(outputJsonPath)) {
          return reject(new Error("OCR 결과 JSON 파일이 생성되지 않았습니다."));
        }

        try {
          const jsonText = fs.readFileSync(outputJsonPath, "utf8");
          const parsed = JSON.parse(jsonText);

          // ✅ 분석 완료 후 임시 생성된 JSON 파일 삭제 (서버 용량 관리)
          if (fs.existsSync(outputJsonPath)) {
            fs.unlinkSync(outputJsonPath);
          }
          
          console.log("--- DocForge OCR 분석 완료 ---");

          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

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
// [추가] 3-1. 학생 전체 목록 조회 API
// 👉 프론트엔드 학생 선택 화면에서 리스트를 뿌려주기 위해 필요합니다.
// ================================
app.get("/students/list", async (req, res) => {
  try {
    // 최신순으로 학생 목록을 가져옵니다.
    const result = await pool.query(
      "SELECT id, name, grade, school_type, high_school, address FROM students ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("학생 목록 조회 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});

// ================================
// [추가] 3-2. 특정 학생 상세 조회 API
// ================================
app.get("/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. ID 유효성 체크 (숫자인지 확인)
    if (isNaN(parseInt(id))) {
      console.warn(`⚠️ 유효하지 않은 학생 ID 요청: ${id}`);
      return res.status(400).json({ error: "유효하지 않은 학생 ID 형식입니다." });
    }

    // self_intro_chunks를 제외한 나머지 컬럼들만 선택하여 조회
    const query = `
      SELECT 
        id, 
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
        status, 
        self_intro_file_url, 
        self_intro_text,
        created_at, 
        updated_at 
      FROM students WHERE id = $1`;
    
    const studentId = parseInt(id, 10);
    const result = await pool.query(query, [studentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "학생을 찾을 수 없습니다." });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`❌ [ID:${id}] 학생 상세 조회 에러:`, err.message);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
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
    return res.status(400).json({ error: "파일이 전송되지 않았습니다. 프론트엔드의 FormData 키값이 'file'인지 확인하세요." });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const fullPath = req.file.path; // 서버 내 실제 파일 경로

  try {
    console.log(`[업로드 완료] 파일명: ${req.file.filename}, 학생ID: ${student_id}`);

    // 1️⃣ DocForge 실행 (OCR 분석)
    const chunks = await runDocForge(fullPath);

    // 2️⃣ DB 업데이트
    // chunks가 이미 객체이므로, DB 컬럼이 JSONB라면 그대로 들어가고 TEXT라면 문자열화가 필요합니다.
    // 안전하게 JSON.stringify를 사용하는 것이 좋습니다.
    await pool.query(`
      UPDATE students
      SET self_intro_file_url = $1,
          self_intro_chunks = $2, 
          updated_at = NOW()
      WHERE id = $3
    `, [fileUrl, JSON.stringify(chunks), student_id]);

    // 3️⃣ AI 서버 전달용 데이터 준비
    const aiPayload = {
      id: parseInt(student_id, 10), // AI 서버 요구사항에 맞춰 int형으로 변환
      chunks: chunks && chunks.chunks ? chunks.chunks : [] // 실제 청크 배열만 추출하여 전달
    };

    // 🔥 [디버그] 터미널에 AI 서버로 보낼 데이터 출력
    console.log("\n" + "=".repeat(50));
    console.log("🚀 [AI 서버 전송 데이터 디버깅]");
    console.log(JSON.stringify(aiPayload, null, 2));
    console.log("=".repeat(50) + "\n");

    // 4️⃣ 디버깅용 파일 저장 (backend/chunkdebug.json)
    const debugPath = path.resolve(__dirname, "chunkdebug.json");
    try {
      fs.writeFileSync(debugPath, JSON.stringify(aiPayload, null, 2), "utf8");
      console.log(`✅ [파일저장성공] 절대경로: ${debugPath}`);
    } catch (fsErr) {
      console.error("❌ [파일저장실패] 이유:", fsErr.message);
    }

    // 5️⃣ AI 서버로 전달하는 코드 (엔드포인트 확정 시 주석 해제 후 사용)
    /*
    const AI_BASE_URL = "http://your-ai-server-address"; // AI 서버의 실제 주소를 입력하세요
    fetch(`${AI_BASE_URL}/api/v1/upload/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiPayload),
    })
    .then(response => {
      if (response.ok) console.log("✅ AI 서버로 데이터 전송 성공");
      else console.error("❌ AI 서버 응답 에러:", response.status);
    })
    .catch(err => console.error("❌ AI 서버 전송 중 오류 발생:", err.message));
    */
    // 5️⃣ AI 서버로 전달 (ngrok 엔드포인트 테스트)
    const AI_ENDPOINT = "https://beverlee-lazulitic-lustfully.ngrok-free.dev/educonsult/api/v1/upload/student";
    
    try {
      console.log("📡 AI 서버로 데이터 전송 시작...");
      const aiRes = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPayload),
      });

      if (aiRes.ok) {
        console.log("✅ AI 서버 데이터 전송 성공");
      } else {
        console.error("❌ AI 서버 응답 에러:", aiRes.status);
      }
    } catch (aiErr) {
      console.error("❌ AI 서버 전송 중 오류 발생:", aiErr.message);
    }

    res.json({ 
      success: true,
      message: "파일 업로드, OCR 분석 및 AI 서버 전송 시도 완료",
      file_url: fileUrl,
      student_id: student_id,
      chunks: aiPayload.chunks, // 추출된 배열 반환
      chunks_count: aiPayload.chunks.length
    });

  } catch (err) {
    console.error("❌ OCR 처리 중 오류 발생:", err);

    // 분석 실패 시 서버에 저장된 원본 파일 삭제 (선택 사항)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.status(500).json({ 
      error: "OCR 분석 실패", 
      details: err.message 
    });
  }
});


// ================================
// 6. 학생 제출 + 추천 요청 생성
// ================================
app.post("/students/submit", async (req, res) => {
  const { student_id, instruction_text } = req.body;

  try {
    // 1️⃣ 학생 상태 업데이트
    await pool.query(
      "UPDATE students SET status = 'reviewing', updated_at = NOW() WHERE id = $1",
      [student_id]
    );

    // 2️⃣ 추천 세션(recommendation_sessions) 생성
    // 💡 여기서 생성된 ID가 프론트엔드의 sessionId가 됩니다.
    const sessionResult = await pool.query(
      `INSERT INTO recommendation_sessions (student_id, instruction_text, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [student_id, instruction_text]
    );

    const sessionId = sessionResult.rows[0].id;

    // 3️⃣ [중요] AI 서버 통신 로직 트리거
    // 이미 구현하신 AI 서버 통신 함수가 있다면 여기서 호출하세요.
    // 예: await callAiServerForMatching(student_id, sessionId);
    
    res.json({ 
      success: true, 
      id: sessionId, 
      message: "세션이 성공적으로 생성되었습니다." 
    });

  } catch (err) {
    console.error("제출 에러:", err);
    res.status(500).json({ error: "세션 생성 실패" });
  }
});

// ================================
// [추가] 6-1. 특정 세션 정보 조회 API
// 👉 프론트엔드에서 sessionId를 가지고 접속했을 때 초기 데이터(학생 이름 등)를 가져오기 위함
// ================================
app.get("/sessions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        rs.id as "sessionId",
        rs.student_id as "studentId",
        rs.instruction_text as "directorInstruction",
        rs.status,
        s.name as "studentName",
        s.grade,
        s.high_school,
        s.school_type
      FROM recommendation_sessions rs
      JOIN students s ON rs.student_id = s.id
      WHERE rs.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
    }

    const sessionData = result.rows[0];
    // 프론트엔드 채팅 컴포넌트 에러 방지를 위한 초기 메시지 배열 추가
    sessionData.messages = []; 

    res.json(sessionData);
  } catch (err) {
    console.error(err);
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
// 10. 선생님 관련 API
// ================================

// 10-1. 선생님 전체 목록 조회 (학력, 과목 포함)
app.get("/teachers", async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        te.university, te.major, te.level,
        (SELECT json_agg(ts.subject_name) FROM teacher_subjects ts WHERE ts.teacher_id = t.id) as subjects,
        (SELECT json_agg(json_build_object('day', sch.day, 'from', sch.from_time, 'to', sch.to_time)) 
         FROM teacher_schedules sch WHERE sch.teacher_id = t.id) as schedules
      FROM teachers t
      LEFT JOIN teacher_educations te ON t.id = te.teacher_id
      ORDER BY t.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("선생님 목록 조회 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});

// 10-2. 특정 선생님 상세 조회
app.get("/teachers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        t.*,
        te.university, te.major, te.level,
        (SELECT json_agg(ts.subject_name) FROM teacher_subjects ts WHERE ts.teacher_id = t.id) as subjects,
        (SELECT json_agg(json_build_object('day', sch.day, 'from', sch.from_time, 'to', sch.to_time)) 
         FROM teacher_schedules sch WHERE sch.teacher_id = t.id) as schedules
      FROM teachers t
      LEFT JOIN teacher_educations te ON t.id = te.teacher_id
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "선생님을 찾을 수 없습니다." });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("선생님 상세 조회 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});

// 10-3. 과목별 선생님 필터링 조회 (선택 사항)
app.get("/teachers/search/subject", async (req, res) => {
  const { name } = req.query; // 예: /teachers/search/subject?name=의학계열
  try {
    const query = `
      SELECT DISTINCT t.id, t.name, t.location, te.university, te.major
      FROM teachers t
      JOIN teacher_subjects ts ON t.id = ts.teacher_id
      LEFT JOIN teacher_educations te ON t.id = te.teacher_id
      WHERE ts.subject_name LIKE $1
    `;
    const result = await pool.query(query, [`%${name}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error("과목별 선생님 검색 에러:", err);
    res.status(500).json({ error: "DB 에러" });
  }
});

// 10-4. 통합 필터링 검색 (성별, 지역, 오프라인, 학력, 과목, 경력, 키워드, 일정)
// 예: /teachers/search/filter?location=서울&subject=의학&keyword=서울대&min_experience=3
app.get("/teachers/search/filter", async (req, res) => {
  console.log("📥 [GET] /teachers/search/filter - 요청 도착");
  console.log("📝 쿼리 파라미터:", req.query);

  const {
    gender,
    location,
    offline_course,
    university,
    subject,
    min_experience, // 숫자 (년 단위)
    keyword,        // 성과/설명 키워드 (예: '서울대', '의대', 'MMI')
    avail_date,     // YYYY-MM-DD (해당 날짜에 활동 가능한지)
    avail_day       // 'Mon', 'Tue' 등 (해당 요일에 수업이 있는지)
  } = req.query;

  let whereClauses = [];
  let params = [];

  // 유효한 값인지 체크하는 헬퍼 함수 (undefined, null, 빈 문자열, "undefined" 문자열 방지)
  const isValid = (val) => val !== undefined && val !== null && val !== "" && val !== "undefined" && val !== "null";

  if (isValid(gender)) {
    const nGender = parseInt(gender, 10);
    if (!isNaN(nGender)) {
      params.push(nGender);
      whereClauses.push(`t.gender = $${params.length}`);
    }
  }
  if (isValid(location)) {
    params.push(`%${location}%`);
    whereClauses.push(`t.location ILIKE $${params.length}`);
  }
  if (isValid(offline_course)) {
    params.push(offline_course === 'true');
    whereClauses.push(`t.offline_course = $${params.length}`);
  }
  if (isValid(university)) {
    params.push(`%${university}%`);
    whereClauses.push(`te.university ILIKE $${params.length}`);
  }
  if (isValid(subject)) {
    params.push(`%${subject}%`);
    whereClauses.push(`EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.subject_name ILIKE $${params.length})`);
  }
  if (isValid(min_experience) && !isNaN(parseInt(min_experience))) {
    const expYears = Math.max(0, parseInt(min_experience, 10)); // 음수 방지
    params.push(`${expYears} years`); // PostgreSQL INTERVAL 형식 문자열
    whereClauses.push(`t.start_tutoring <= CURRENT_DATE - CAST($${params.length} AS INTERVAL)`);
  }
  if (isValid(keyword)) {
    params.push(`%${keyword}%`);
    whereClauses.push(`(t.description ILIKE $${params.length} OR t.style ILIKE $${params.length} OR t.student_history ILIKE $${params.length} OR EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.subject_name ILIKE $${params.length}))`);
  }
  if (isValid(avail_date)) {
    params.push(avail_date);
    whereClauses.push(`$${params.length} BETWEEN t.avail_date_from AND t.avail_date_to`);
  }
  if (isValid(avail_day)) {
    params.push(avail_day);
    whereClauses.push(`EXISTS (SELECT 1 FROM teacher_schedules sch WHERE sch.teacher_id = t.id AND sch.day = $${params.length})`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const query = `
    SELECT 
      t.*,
      te.university, te.major, te.level,
      (SELECT json_agg(ts.subject_name) FROM teacher_subjects ts WHERE ts.teacher_id = t.id) as subjects,
      (SELECT json_agg(json_build_object('day', sch.day, 'from', sch.from_time, 'to', sch.to_time)) 
       FROM teacher_schedules sch WHERE sch.teacher_id = t.id) as schedules
    FROM teachers t
    LEFT JOIN teacher_educations te ON t.id = te.teacher_id
    ${whereString}
    ORDER BY t.id ASC
  `;

  try {
    console.log("🔍 실행될 SQL:", query.replace(/\s+/g, ' ').trim());
    console.log("📦 파라미터:", params);

    const result = await pool.query(query, params);
    console.log(`✅ 검색 성공: ${result.rows.length}명의 선생님 발견`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ [서버 내부 에러] 상세 내용:", err);
    res.status(500).json({ 
      error: "서버 내부 에러", 
      message: err.message,
      stack: err.stack // 개발 단계에서 원인 파악을 위해 스택 정보 포함
    });
  }
});

// ================================
// 9. 서버 실행
// ================================
app.listen(3001, () => {
  console.log("✅ 서버 실행됨: http://localhost:3001");
});
