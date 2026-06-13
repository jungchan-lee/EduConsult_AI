'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentIntakeFormData } from '@/types/student';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { Checkbox } from '@/components/ui/Checkbox';

const schoolTypeOptions = [
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
];

const genderOptions = [
  { value: 'male', label: '남' },
  { value: 'female', label: '여' },
];

const contactPersonOptions = [
  { value: 'student', label: '학생' },
  { value: 'parent', label: '부모' },
];

const majorKnowledgeOptions = [
  { value: 'sufficient', label: '충분' },
  { value: 'adequate', label: '적당' },
  { value: 'lacking', label: '다소 부족' },
  { value: 'insufficient', label: '매우 부족' },
  { value: 'none', label: '경험 전무' },
];

const levelOptions = [
  { value: 'sufficient', label: '충분' },
  { value: 'adequate', label: '적당' },
  { value: 'lacking', label: '다소 부족' },
  { value: 'insufficient', label: '매우 부족' },
  { value: 'none', label: '경험 전무' },
];

const speechConcernsOptions = [
  { value: '유창성', label: '유창성' },
  { value: '자세', label: '자세' },
  { value: '목소리', label: '목소리' },
  { value: '얼굴표정', label: '얼굴표정' },
  { value: '두괄식', label: '두괄식' },
  { value: '논리적말하기', label: '논리적 말하기' },
];

// 백엔드 API 베이스 URL
const BACKEND_URL = 'https://9dcb-122-32-117-5.ngrok-free.app';

interface StudentIntakeFormProps {
  onSubmit?: (data: StudentIntakeFormData) => Promise<void>;
  isLoading?: boolean;
}

export const StudentIntakeForm: React.FC<StudentIntakeFormProps> = ({ onSubmit, isLoading = false }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<StudentIntakeFormData>({
    basicInfo: {
      name: '',
      grade: '',
      gender: '',
      phone: '',
      schoolType: '',
      parentPhone: '',
      highSchool: '',
      address: '',
      contactPerson: 'student',
    },
    interviewSchools: [
      { school: '', major: '', examType: '', firstAnnouncementDate: '', interviewDate: '', interviewFormat: '' }
    ],
    preSurvey: {
      personalityReadiness: '',
      recordDifficulty: '',
      majorKnowledge: 'adequate',
      speechConcerns: [],
      careerAlignment: 'aligned',
      careerAlignmentReason: '',
      priorPresentationPrep: '',
      readingComprehension: 'adequate',
      backgroundKnowledge: 'adequate',
      answerProcess: 'know',
      expressionAbility: 'adequate',
      additionalConcerns: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.basicInfo.name) newErrors.name = '이름은 필수입니다';
    if (!formData.basicInfo.phone) newErrors.phone = '연락처는 필수입니다';
    if (!formData.basicInfo.grade) newErrors.grade = '내신 등급은 필수입니다';
    if (!formData.basicInfo.schoolType) newErrors.schoolType = '현재 상태는 필수입니다';
    if (!formData.basicInfo.parentPhone) newErrors.parentPhone = '부모 연락처는 필수입니다';
    if (!formData.basicInfo.highSchool) newErrors.highSchool = '출신 고등학교는 필수입니다';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, [field]: value },
    }));
  };

  const handleInterviewSchoolChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      interviewSchools: prev.interviewSchools.map((school, idx) =>
        idx === index ? { ...school, [field]: value } : school
      ),
    }));
  };

  const addInterviewSchool = () => {
    setFormData((prev) => ({
      ...prev,
      interviewSchools: [
        ...prev.interviewSchools,
        { school: '', major: '', examType: '', firstAnnouncementDate: '', interviewDate: '', interviewFormat: '' }
      ],
    }));
  };

  const removeInterviewSchool = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      interviewSchools: prev.interviewSchools.filter((_, idx) => idx !== index),
    }));
  };

  const handlePreSurveyChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      preSurvey: { ...prev.preSurvey, [field]: value },
    }));
  };

  const handleSpeechConcernToggle = (concern: string) => {
    setFormData((prev) => ({
      ...prev,
      preSurvey: {
        ...prev.preSurvey,
        speechConcerns: prev.preSurvey.speechConcerns.includes(concern)
          ? prev.preSurvey.speechConcerns.filter((c) => c !== concern)
          : [...prev.preSurvey.speechConcerns, concern],
      },
    }));
  };

  const handleFileUpload = (file: File | null) => {
    setBioFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/students/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '69420'
        },
        body: JSON.stringify({
          name: formData.basicInfo.name,
          phone: formData.basicInfo.phone,
          grade: formData.basicInfo.grade,
          parent_phone: formData.basicInfo.parentPhone,
          gender: formData.basicInfo.gender,
          school_type: formData.basicInfo.schoolType,
          high_school: formData.basicInfo.highSchool,
          address: formData.basicInfo.address,
          contact_preference: formData.basicInfo.contactPerson,
          email: '',
          survey_json: JSON.stringify(formData.preSurvey),
          interview_json: JSON.stringify(formData.interviewSchools),
        }),
      });

      if (!response.ok) {
        let errorText = '신청 저장 실패';
        try {
          const errorBody = await response.json();
          errorText = errorBody?.error || errorBody?.message || errorText;
        } catch {
          const text = await response.text().catch(() => null);
          if (text) errorText = text;
        }

        throw new Error(errorText);
      }

    const savedStudent = await response.json();
    const studentId = savedStudent.id;

    // ==============================
    // 2️⃣ 파일 업로드 (있을 때만)
    // ==============================
    if (bioFile) {
      const fileFormData = new FormData();
      // Express 서버(localhost:3001)의 upload.single("file") 설정에 맞춰 필드명을 'file'로 수정합니다.
      fileFormData.append('file', bioFile);
      fileFormData.append('student_id', String(studentId));

      const uploadRes = await fetch(`${BACKEND_URL}/students/upload`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': '69420'
        },
        body: fileFormData,
      });

      if (!uploadRes.ok) {
        let uploadError = '파일 업로드 실패';
        try {
          const errorData = await uploadRes.json();
          uploadError = errorData.message || errorData.error || uploadError;
        } catch {
          const text = await uploadRes.text().catch(() => null);
          if (text) uploadError = text;
        }
        throw new Error(uploadError);
      }
    }
    // ==============================
    // 완료
    // ==============================\
      alert('신청이 완료되었습니다!');
      router.push('/');

      setFormData({
        basicInfo: {
          name: '',
          grade: '',
          gender: '',
          phone: '',
          schoolType: '',
          parentPhone: '',
          highSchool: '',
          address: '',
          contactPerson: 'student',
        },
        interviewSchools: [
          { school: '', major: '', examType: '', firstAnnouncementDate: '', interviewDate: '', interviewFormat: '' }
        ],
        preSurvey: {
          personalityReadiness: '',
          recordDifficulty: '',
          majorKnowledge: 'adequate',
          speechConcerns: [],
          careerAlignment: 'aligned',
          careerAlignmentReason: '',
          priorPresentationPrep: '',
          readingComprehension: 'adequate',
          backgroundKnowledge: 'adequate',
          answerProcess: 'know',
          expressionAbility: 'adequate',
          additionalConcerns: '',
        },
      });
      setBioFile(null);
    } catch (error) {
      console.error('Submission error:', error);
      alert(`신청 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. 인적사항 Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            1
          </div>
          <h2 className="text-xl font-semibold text-gray-900">인적사항</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="이름"
            placeholder="학생 이름"
            required
            value={formData.basicInfo.name}
            onChange={(e) => handleBasicInfoChange('name', e.target.value)}
            error={errors.name}
          />
          <Input
            label="내신 등급"
            placeholder="예: 2.5"
            value={formData.basicInfo.grade}
            onChange={(e) => handleBasicInfoChange('grade', e.target.value)}
            error={errors.grade}
          />
          <Select
            label="성별"
            options={genderOptions}
            value={formData.basicInfo.gender}
            onChange={(e) => handleBasicInfoChange('gender', e.target.value)}
          />
          <Input
            label="연락처"
            placeholder="010-0000-0000"
            required
            value={formData.basicInfo.phone}
            onChange={(e) => handleBasicInfoChange('phone', e.target.value)}
            error={errors.phone}
          />
          <Select
            label="현재"
            required
            options={schoolTypeOptions}
            value={formData.basicInfo.schoolType}
            onChange={(e) => handleBasicInfoChange('schoolType', e.target.value)}
            error={errors.schoolType}
            placeholder="선택하세요"
          />
          <Input
            label="부모님 연락처"
            placeholder="010-0000-0000"
            required
            value={formData.basicInfo.parentPhone}
            onChange={(e) => handleBasicInfoChange('parentPhone', e.target.value)}
            error={errors.parentPhone}
          />
          <Input
            label="출신 고등학교"
            placeholder="고등학교명"
            required
            value={formData.basicInfo.highSchool}
            onChange={(e) => handleBasicInfoChange('highSchool', e.target.value)}
            error={errors.highSchool}
          />
          <Input
            label="주소 간략"
            placeholder="예: 서울시 강남구"
            value={formData.basicInfo.address}
            onChange={(e) => handleBasicInfoChange('address', e.target.value)}
          />
          <Select
            label="등록 상담 연락 받으실 분"
            options={contactPersonOptions}
            value={formData.basicInfo.contactPerson}
            onChange={(e) => handleBasicInfoChange('contactPerson', e.target.value as 'student' | 'parent')}
          />
        </div>
      </section>

      {/* 2. 면접 전형이 있는 학교 Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            2
          </div>
          <h2 className="text-xl font-semibold text-gray-900">면접 전형이 있는 학교</h2>
        </div>

        <div className="space-y-6">
          {formData.interviewSchools.map((school, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="학교"
                  placeholder="학교명"
                  value={school.school}
                  onChange={(e) => handleInterviewSchoolChange(index, 'school', e.target.value)}
                />
                <Input
                  label="학과(계열)"
                  placeholder="학과명"
                  value={school.major}
                  onChange={(e) => handleInterviewSchoolChange(index, 'major', e.target.value)}
                />
                <Input
                  label="전형"
                  placeholder="예: 수시, 정시"
                  value={school.examType}
                  onChange={(e) => handleInterviewSchoolChange(index, 'examType', e.target.value)}
                />
                <Input
                  label="1차 발표일"
                  type="date"
                  value={school.firstAnnouncementDate}
                  onChange={(e) => handleInterviewSchoolChange(index, 'firstAnnouncementDate', e.target.value)}
                />
                <Input
                  label="면접일자"
                  type="date"
                  value={school.interviewDate}
                  onChange={(e) => handleInterviewSchoolChange(index, 'interviewDate', e.target.value)}
                />
                <Input
                  label="면접 형태"
                  placeholder="예: 개별면접, 그룹면접"
                  value={school.interviewFormat}
                  onChange={(e) => handleInterviewSchoolChange(index, 'interviewFormat', e.target.value)}
                />
              </div>
              {formData.interviewSchools.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => removeInterviewSchool(index)}
                  className="w-full text-red-600"
                >
                  삭제
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={addInterviewSchool}
            className="w-full"
          >
            + 학교 추가
          </Button>
        </div>
      </section>

      {/* 3. 사전 설문 Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            3
          </div>
          <h2 className="text-xl font-semibold text-gray-900">사전 설문</h2>
        </div>

        <div className="space-y-6">
          <Textarea
            label="인성 영역에서 말할 내용이 준비되어 있는지"
            placeholder="자기소개, 가치관, 지원동기, 공동체 의식 등 준비 상황"
            value={formData.preSurvey.personalityReadiness}
            onChange={(e) => handlePreSurveyChange('personalityReadiness', e.target.value)}
          />

          <Textarea
            label="생기부에 기재된 내용 중 가장 어려운 부분"
            placeholder="내용 파악 혹은 답변하기에 가장 어려운 부분 설명"
            value={formData.preSurvey.recordDifficulty}
            onChange={(e) => handlePreSurveyChange('recordDifficulty', e.target.value)}
          />

          <Select
            label="전공 관련 지식 수준"
            options={majorKnowledgeOptions}
            value={formData.preSurvey.majorKnowledge}
            onChange={(e) => handlePreSurveyChange('majorKnowledge', e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">스피치 영역에서 고민되는 부분</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {speechConcernsOptions.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={formData.preSurvey.speechConcerns.includes(option.value)}
                  onChange={() => handleSpeechConcernToggle(option.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">생기부 방향성과 지원계열/전공 간 연관성</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="careerAlignment"
                  value="aligned"
                  checked={formData.preSurvey.careerAlignment === 'aligned'}
                  onChange={(e) => handlePreSurveyChange('careerAlignment', e.target.value)}
                />
                <span>일치</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="careerAlignment"
                  value="misaligned"
                  checked={formData.preSurvey.careerAlignment === 'misaligned'}
                  onChange={(e) => handlePreSurveyChange('careerAlignment', e.target.value)}
                />
                <span>불일치</span>
              </label>
            </div>
          </div>

          {formData.preSurvey.careerAlignment === 'misaligned' && (
            <Textarea
              label="불일치인 경우 설명"
              placeholder="어떤 상황인지, 학년별로 어떠했는지 알려주세요"
              value={formData.preSurvey.careerAlignmentReason || ''}
              onChange={(e) => handlePreSurveyChange('careerAlignmentReason', e.target.value)}
            />
          )}

          <Textarea
            label="제시문 기반 면접 준비 경험"
            placeholder="이전에 제시문 기반 면접(또는 MMI) 준비를 해본 적이 있는지"
            value={formData.preSurvey.priorPresentationPrep}
            onChange={(e) => handlePreSurveyChange('priorPresentationPrep', e.target.value)}
          />

          <Select
            label="제시문 독해력"
            options={levelOptions}
            value={formData.preSurvey.readingComprehension}
            onChange={(e) => handlePreSurveyChange('readingComprehension', e.target.value)}
          />

          <Select
            label="배경지식 수준"
            options={levelOptions}
            value={formData.preSurvey.backgroundKnowledge}
            onChange={(e) => handlePreSurveyChange('backgroundKnowledge', e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">답변 프로세스</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answerProcess"
                  value="know"
                  checked={formData.preSurvey.answerProcess === 'know'}
                  onChange={(e) => handlePreSurveyChange('answerProcess', e.target.value)}
                />
                <span>안다</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answerProcess"
                  value="unknown"
                  checked={formData.preSurvey.answerProcess === 'unknown'}
                  onChange={(e) => handlePreSurveyChange('answerProcess', e.target.value)}
                />
                <span>모른다</span>
              </label>
            </div>
          </div>

          <Select
            label="아는 것을 말로 풀어내는 능력"
            options={levelOptions}
            value={formData.preSurvey.expressionAbility}
            onChange={(e) => handlePreSurveyChange('expressionAbility', e.target.value)}
          />

          <Textarea
            label="기타 걱정되는 부분이나 바라는 점"
            placeholder="컨설턴트 배정시 참고합니다. 수능 준비 여부 / 논술 준비 여부 / 학생 성향 등 자세할수록 좋습니다."
            value={formData.preSurvey.additionalConcerns}
            onChange={(e) => handlePreSurveyChange('additionalConcerns', e.target.value)}
          />
        </div>
      </section>

      {/* 4. 생기부 PDF Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            4
          </div>
          <h2 className="text-xl font-semibold text-gray-900">생활 기록부 파일</h2>
        </div>

        <FileUpload
          label="생기부 파일 업로드"
          accept=".pdf,.docx,image/*"
          onChange={handleFileUpload}
          value={bioFile}
          helperText="학생의 생기부 PDF, Word(docx) 또는 이미지 파일을 업로드해주세요"
        />
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <Button variant="primary" size="lg" type="submit" isLoading={isSubmitting}>
          신청 완료
        </Button>
      </div>
    </form>
  );
};
