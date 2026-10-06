// @ts-ignore
import PDFDocument from 'pdfkit-table';
import { Response } from 'express';
import { StudentAttendanceSummary } from './attendanceStatsService.js';

export interface PDFReportOptions {
  institutionName?: string;
  classroom: {
    subjectName: string;
    subjectCode: string;
    section: string;
    semester: number;
    academicYear: string;
    teacherName: string;
  };
  totalSessions: number;
  classAverage: number;
  students: StudentAttendanceSummary[];
  generatedAt?: Date;
}

export class PDFService {
  /**
   * Generates a beautifully formatted attendance PDF report and streams to the response
   */
  static async generateAttendancePDF(
    res: Response,
    options: PDFReportOptions
  ): Promise<void> {
    const {
      institutionName = 'SMARTATTEND UNIVERSITY',
      classroom,
      totalSessions,
      classAverage,
      students,
      generatedAt = new Date(),
    } = options;

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: `Attendance Report - ${classroom.subjectCode}`,
        Author: 'SmartAttend System',
        Subject: `Attendance summary for ${classroom.subjectName}`,
      },
    });

    // Set headers for download
    const filename = `Attendance_${classroom.subjectCode.replace(/[^a-zA-Z0-9]/g, '_')}_${classroom.section}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header banner with clean navy/blue styling
    doc
      .rect(40, 40, 515, 60)
      .fill('#1e3a8a'); // Tailwind blue-900

    doc
      .fillColor('#ffffff')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(institutionName.toUpperCase(), 50, 52, { align: 'center', width: 495 });

    doc
      .fontSize(11)
      .font('Helvetica')
      .text('OFFICIAL ATTENDANCE REPORT & ANTI-PROXY VERIFICATION AUDIT', 50, 75, {
        align: 'center',
        width: 495,
      });

    doc.moveDown(2);

    // Subject & Metadata Box
    doc
      .rect(40, 115, 515, 80)
      .lineWidth(1)
      .strokeColor('#cbd5e1')
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc.fillColor('#0f172a').fontSize(9).font('Helvetica');

    // Column 1
    doc.text(`Subject: ${classroom.subjectName} (${classroom.subjectCode})`, 55, 125);
    doc.text(`Instructor: ${classroom.teacherName}`, 55, 142);
    doc.text(`Class/Section: ${classroom.section}`, 55, 159);
    doc.text(`Semester: ${classroom.semester}`, 55, 176);

    // Column 2
    doc.text(`Academic Year: ${classroom.academicYear}`, 320, 125);
    doc.text(`Total Sessions Conducted: ${totalSessions}`, 320, 142);
    doc.text(`Enrolled Students: ${students.length}`, 320, 159);
    doc.text(`Class Average Attendance: ${classAverage}%`, 320, 176);

    doc.moveDown(3);

    // Format table rows
    const rows = students.map((s, idx) => [
      String(idx + 1),
      s.rollNumber,
      s.name,
      String(s.attendedClasses),
      String(s.missedClasses),
      `${s.attendancePercentage}%`,
      s.isLowAttendance ? 'SHORTAGE (<75%)' : 'ELIGIBLE',
    ]);

    const tableData = {
      title: 'Student-Wise Attendance Breakdown',
      headers: [
        { label: '#', property: 'sno', width: 25 },
        { label: 'Roll No', property: 'roll', width: 75 },
        { label: 'Student Name', property: 'name', width: 140 },
        { label: 'Present', property: 'present', width: 50 },
        { label: 'Absent', property: 'absent', width: 50 },
        { label: 'Att. %', property: 'percentage', width: 60 },
        { label: 'Eligibility Status', property: 'status', width: 115 },
      ],
      rows: rows,
    };

    // Render table
    await doc.table(tableData, {
      x: 40,
      y: 215,
      divider: {
        header: { disabled: false, width: 1, opacity: 1 },
        horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b'),
      prepareRow: (row: any, indexColumn: any, indexRow: any, rectRow: any) => {
        doc.font('Helvetica').fontSize(8).fillColor('#334155');
        return doc;
      },
    });

    // Verification Footer note
    doc.moveDown(2);
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#64748b')
      .text(
        `Report generated automatically by SmartAttend Anti-Proxy Attendance System on ${generatedAt.toLocaleString()}. Verified with 25-meter GPS geofencing & biometric authentication.`,
        40,
        doc.page.height - 65,
        { align: 'center', width: 515 }
      );

    doc.end();
  }
}
