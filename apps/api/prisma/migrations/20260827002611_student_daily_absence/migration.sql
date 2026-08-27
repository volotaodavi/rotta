-- CreateTable
CREATE TABLE "student_daily_absences" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "motivo" TEXT,
    "criadoPorUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_daily_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_daily_absences_studentId_data_idx" ON "student_daily_absences"("studentId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "student_daily_absences_studentId_data_key" ON "student_daily_absences"("studentId", "data");

-- AddForeignKey
ALTER TABLE "student_daily_absences" ADD CONSTRAINT "student_daily_absences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_daily_absences" ADD CONSTRAINT "student_daily_absences_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
