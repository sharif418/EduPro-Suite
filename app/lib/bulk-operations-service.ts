import { prisma } from './prisma';

export interface BulkOperationResult {
  id: string;
  operation: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: BulkOperationError[];
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
  metadata?: any;
}

export interface BulkOperationError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface StudentImportData {
  studentId?: string;
  name: string;
  email?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  guardianName: string;
  guardianRelation: string;
  guardianContact: string;
  guardianEmail?: string;
  presentAddress: string;
  permanentAddress: string;
  classLevel: string;
  section: string;
  rollNumber?: number;
}

export interface StaffImportData {
  staffId?: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  contactNumber: string;
  joiningDate: string;
  qualification: string;
  presentAddress: string;
  permanentAddress: string;
  role: 'TEACHER' | 'ADMIN' | 'ACCOUNTANT' | 'LIBRARIAN';
}

export interface GradeImportData {
  studentId: string;
  examName: string;
  subjectName: string;
  marksObtained: number;
  fullMarks: number;
  grade?: string;
  remarks?: string;
}

export interface AttendanceImportData {
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';
  remarks?: string;
}

export interface FeeStructureImportData {
  classLevel: string;
  feeHead: string;
  amount: number;
  description?: string;
}

export class BulkOperationsService {

  /**
   * Import students from CSV/Excel data
   */
  static async importStudents(
    studentsData: StudentImportData[],
    createdBy: string,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_students_${Date.now()}`;
    const errors: BulkOperationError[] = [];
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    try {
      console.log(`Starting student import operation: ${operationId}`);

      // Validation phase
      for (let i = 0; i < studentsData.length; i++) {
        const student = studentsData[i];
        const rowNumber = i + 1;

        // Validate required fields
        if (!student.name) {
          errors.push({
            row: rowNumber,
            field: 'name',
            message: 'Student name is required',
            data: student
          });
        }

        if (!student.dateOfBirth) {
          errors.push({
            row: rowNumber,
            field: 'dateOfBirth',
            message: 'Date of birth is required',
            data: student
          });
        }

        if (!student.guardianName) {
          errors.push({
            row: rowNumber,
            field: 'guardianName',
            message: 'Guardian name is required',
            data: student
          });
        }

        if (!student.guardianContact) {
          errors.push({
            row: rowNumber,
            field: 'guardianContact',
            message: 'Guardian contact is required',
            data: student
          });
        }

        if (!student.classLevel) {
          errors.push({
            row: rowNumber,
            field: 'classLevel',
            message: 'Class level is required',
            data: student
          });
        }

        if (!student.section) {
          errors.push({
            row: rowNumber,
            field: 'section',
            message: 'Section is required',
            data: student
          });
        }

        // Validate email format if provided
        if (student.email && !this.isValidEmail(student.email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Invalid email format',
            data: student
          });
        }

        // Validate date format
        if (student.dateOfBirth && !this.isValidDate(student.dateOfBirth)) {
          errors.push({
            row: rowNumber,
            field: 'dateOfBirth',
            message: 'Invalid date format. Use YYYY-MM-DD',
            data: student
          });
        }
      }

      if (options.validateOnly) {
        return {
          id: operationId,
          operation: 'STUDENT_IMPORT_VALIDATION',
          status: errors.length > 0 ? 'FAILED' : 'COMPLETED',
          totalRecords: studentsData.length,
          processedRecords: studentsData.length,
          successfulRecords: studentsData.length - errors.length,
          failedRecords: errors.length,
          errors,
          startedAt: new Date(),
          completedAt: new Date(),
          createdBy
        };
      }

      // Processing phase
      for (let i = 0; i < studentsData.length; i++) {
        const student = studentsData[i];
        const rowNumber = i + 1;
        processedRecords++;

        try {
          // Check if student already exists
          const existingStudent = await prisma.student.findFirst({
            where: {
              OR: [
                { email: student.email },
                { studentId: student.studentId }
              ]
            }
          });

          if (existingStudent) {
            if (options.skipDuplicates) {
              continue;
            } else if (!options.updateExisting) {
              errors.push({
                row: rowNumber,
                message: 'Student already exists',
                data: student
              });
              failedRecords++;
              continue;
            }
          }

          // Find or create guardian
          let guardian = await prisma.guardian.findFirst({
            where: {
              contactNumber: student.guardianContact
            }
          });

          if (!guardian) {
            guardian = await prisma.guardian.create({
              data: {
                name: student.guardianName,
                relationToStudent: student.guardianRelation || 'Parent',
                contactNumber: student.guardianContact,
                email: student.guardianEmail
              }
            });
          }

          // Create address
          const address = await prisma.studentAddress.create({
            data: {
              presentAddress: student.presentAddress,
              permanentAddress: student.permanentAddress || student.presentAddress
            }
          });

          // Find class level and section
          const classLevel = await prisma.classLevel.findFirst({
            where: { name: student.classLevel }
          });

          if (!classLevel) {
            errors.push({
              row: rowNumber,
              field: 'classLevel',
              message: `Class level '${student.classLevel}' not found`,
              data: student
            });
            failedRecords++;
            continue;
          }

          const section = await prisma.section.findFirst({
            where: {
              name: student.section,
              classLevelId: classLevel.id
            }
          });

          if (!section) {
            errors.push({
              row: rowNumber,
              field: 'section',
              message: `Section '${student.section}' not found in class '${student.classLevel}'`,
              data: student
            });
            failedRecords++;
            continue;
          }

          // Create or update student
          const studentData = {
            studentId: student.studentId || `STU-${Date.now()}-${i}`,
            name: student.name,
            email: student.email,
            dateOfBirth: new Date(student.dateOfBirth),
            gender: student.gender,
            bloodGroup: student.bloodGroup,
            religion: student.religion,
            nationality: student.nationality || 'Bangladeshi',
            admissionDate: new Date(),
            guardianId: guardian.id,
            addressId: address.id
          };

          let createdStudent;
          if (existingStudent && options.updateExisting) {
            createdStudent = await prisma.student.update({
              where: { id: existingStudent.id },
              data: studentData
            });
          } else {
            createdStudent = await prisma.student.create({
              data: studentData
            });
          }

          // Create enrollment
          const currentAcademicYear = await prisma.academicYear.findFirst({
            where: { isCurrent: true }
          });

          if (currentAcademicYear) {
            await prisma.enrollment.upsert({
              where: {
                studentId_academicYearId: {
                  studentId: createdStudent.id,
                  academicYearId: currentAcademicYear.id
                }
              },
              update: {
                classLevelId: classLevel.id,
                sectionId: section.id,
                rollNumber: student.rollNumber || (i + 1)
              },
              create: {
                studentId: createdStudent.id,
                classLevelId: classLevel.id,
                sectionId: section.id,
                academicYearId: currentAcademicYear.id,
                rollNumber: student.rollNumber || (i + 1)
              }
            });
          }

          successfulRecords++;

        } catch (error: any) {
          errors.push({
            row: rowNumber,
            message: error.message || 'Unknown error occurred',
            data: student
          });
          failedRecords++;
        }
      }

      const result: BulkOperationResult = {
        id: operationId,
        operation: 'STUDENT_IMPORT',
        status: failedRecords > 0 ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
        totalRecords: studentsData.length,
        processedRecords,
        successfulRecords,
        failedRecords,
        errors,
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy
      };

      console.log(`Student import completed: ${operationId}`, result);
      return result;

    } catch (error: any) {
      console.error('Error in student import:', error);
      return {
        id: operationId,
        operation: 'STUDENT_IMPORT',
        status: 'FAILED',
        totalRecords: studentsData.length,
        processedRecords,
        successfulRecords,
        failedRecords,
        errors: [{
          row: 0,
          message: error.message || 'System error occurred',
          data: null
        }],
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy
      };
    }
  }

  /**
   * Import staff from CSV/Excel data
   */
  static async importStaff(
    staffData: StaffImportData[],
    createdBy: string,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_staff_${Date.now()}`;
    const errors: BulkOperationError[] = [];
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    try {
      console.log(`Starting staff import operation: ${operationId}`);

      // Validation phase
      for (let i = 0; i < staffData.length; i++) {
        const staff = staffData[i];
        const rowNumber = i + 1;

        // Validate required fields
        if (!staff.name) {
          errors.push({
            row: rowNumber,
            field: 'name',
            message: 'Staff name is required',
            data: staff
          });
        }

        if (!staff.email) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Email is required',
            data: staff
          });
        } else if (!this.isValidEmail(staff.email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Invalid email format',
            data: staff
          });
        }

        if (!staff.designation) {
          errors.push({
            row: rowNumber,
            field: 'designation',
            message: 'Designation is required',
            data: staff
          });
        }

        if (!staff.department) {
          errors.push({
            row: rowNumber,
            field: 'department',
            message: 'Department is required',
            data: staff
          });
        }

        if (!staff.contactNumber) {
          errors.push({
            row: rowNumber,
            field: 'contactNumber',
            message: 'Contact number is required',
            data: staff
          });
        }

        // Validate dates
        if (staff.dateOfBirth && !this.isValidDate(staff.dateOfBirth)) {
          errors.push({
            row: rowNumber,
            field: 'dateOfBirth',
            message: 'Invalid date of birth format. Use YYYY-MM-DD',
            data: staff
          });
        }

        if (staff.joiningDate && !this.isValidDate(staff.joiningDate)) {
          errors.push({
            row: rowNumber,
            field: 'joiningDate',
            message: 'Invalid joining date format. Use YYYY-MM-DD',
            data: staff
          });
        }
      }

      if (options.validateOnly) {
        return {
          id: operationId,
          operation: 'STAFF_IMPORT_VALIDATION',
          status: errors.length > 0 ? 'FAILED' : 'COMPLETED',
          totalRecords: staffData.length,
          processedRecords: staffData.length,
          successfulRecords: staffData.length - errors.length,
          failedRecords: errors.length,
          errors,
          startedAt: new Date(),
          completedAt: new Date(),
          createdBy
        };
      }

      // Processing phase
      for (let i = 0; i < staffData.length; i++) {
        const staff = staffData[i];
        const rowNumber = i + 1;
        processedRecords++;

        try {
          // Check if staff already exists
          const existingUser = await prisma.user.findFirst({
            where: { email: staff.email }
          });

          if (existingUser) {
            if (options.skipDuplicates) {
              continue;
            } else if (!options.updateExisting) {
              errors.push({
                row: rowNumber,
                message: 'Staff member already exists',
                data: staff
              });
              failedRecords++;
              continue;
            }
          }

          // Create address
          const address = await prisma.staffAddress.create({
            data: {
              presentAddress: staff.presentAddress,
              permanentAddress: staff.permanentAddress || staff.presentAddress
            }
          });

          // Create or update user
          const userData = {
            name: staff.name,
            email: staff.email,
            password: 'defaultPassword123', // Should be changed on first login
            role: staff.role
          };

          let user;
          if (existingUser && options.updateExisting) {
            user = await prisma.user.update({
              where: { id: existingUser.id },
              data: userData
            });
          } else {
            user = await prisma.user.create({
              data: userData
            });
          }

          // Create staff record
          const staffRecord = {
            staffId: staff.staffId || `EMP-${Date.now()}-${i}`,
            name: staff.name,
            email: staff.email,
            designation: staff.designation,
            department: staff.department,
            dateOfBirth: new Date(staff.dateOfBirth),
            gender: staff.gender,
            contactNumber: staff.contactNumber,
            joiningDate: new Date(staff.joiningDate),
            qualification: staff.qualification,
            userId: user.id,
            addressId: address.id
          };

          const existingStaff = await prisma.staff.findFirst({
            where: { userId: user.id }
          });

          if (existingStaff && options.updateExisting) {
            await prisma.staff.update({
              where: { id: existingStaff.id },
              data: staffRecord
            });
          } else if (!existingStaff) {
            await prisma.staff.create({
              data: staffRecord
            });
          }

          successfulRecords++;

        } catch (error: any) {
          errors.push({
            row: rowNumber,
            message: error.message || 'Unknown error occurred',
            data: staff
          });
          failedRecords++;
        }
      }

      const result: BulkOperationResult = {
        id: operationId,
        operation: 'STAFF_IMPORT',
        status: failedRecords > 0 ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
        totalRecords: staffData.length,
        processedRecords,
        successfulRecords,
        failedRecords,
        errors,
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy
      };

      console.log(`Staff import completed: ${operationId}`, result);
      return result;

    } catch (error: any) {
      console.error('Error in staff import:', error);
      return {
        id: operationId,
        operation: 'STAFF_IMPORT',
        status: 'FAILED',
        totalRecords: staffData.length,
        processedRecords,
        successfulRecords,
        failedRecords,
        errors: [{
          row: 0,
          message: error.message || 'System error occurred',
          data: null
        }],
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy
      };
    }
  }

  /**
   * Export students to CSV format
   */
  static async exportStudents(filters: {
    classLevelId?: string;
    sectionId?: string;
    academicYearId?: string;
  } = {}): Promise<{
    filename: string;
    data: any[];
    headers: string[];
  }> {
    try {
      const students = await prisma.student.findMany({
        include: {
          guardian: true,
          address: true,
          enrollments: {
            include: {
              classLevel: true,
              section: true,
              academicYear: true
            },
            where: filters.academicYearId ? {
              academicYearId: filters.academicYearId
            } : undefined
          }
        },
        where: filters.classLevelId || filters.sectionId ? {
          enrollments: {
            some: {
              ...(filters.classLevelId && { classLevelId: filters.classLevelId }),
              ...(filters.sectionId && { sectionId: filters.sectionId }),
              ...(filters.academicYearId && { academicYearId: filters.academicYearId })
            }
          }
        } : undefined
      });

      const headers = [
        'Student ID',
        'Name',
        'Email',
        'Date of Birth',
        'Gender',
        'Blood Group',
        'Religion',
        'Nationality',
        'Guardian Name',
        'Guardian Relation',
        'Guardian Contact',
        'Guardian Email',
        'Present Address',
        'Permanent Address',
        'Class Level',
        'Section',
        'Roll Number',
        'Academic Year',
        'Admission Date'
      ];

      const data = students.map(student => {
        const enrollment = student.enrollments[0]; // Get current enrollment
        return {
          'Student ID': student.studentId,
          'Name': student.name,
          'Email': student.email || '',
          'Date of Birth': student.dateOfBirth.toISOString().split('T')[0],
          'Gender': student.gender,
          'Blood Group': student.bloodGroup || '',
          'Religion': student.religion || '',
          'Nationality': student.nationality || '',
          'Guardian Name': student.guardian.name,
          'Guardian Relation': student.guardian.relationToStudent,
          'Guardian Contact': student.guardian.contactNumber,
          'Guardian Email': student.guardian.email || '',
          'Present Address': student.address.presentAddress,
          'Permanent Address': student.address.permanentAddress,
          'Class Level': enrollment?.classLevel.name || '',
          'Section': enrollment?.section.name || '',
          'Roll Number': enrollment?.rollNumber || '',
          'Academic Year': enrollment?.academicYear.year || '',
          'Admission Date': student.admissionDate.toISOString().split('T')[0]
        };
      });

      const filename = `students_export_${Date.now()}.csv`;

      return {
        filename,
        data,
        headers
      };

    } catch (error) {
      console.error('Error exporting students:', error);
      throw new Error('Failed to export students');
    }
  }

  /**
   * Export staff to CSV format
   */
  static async exportStaff(): Promise<{
    filename: string;
    data: any[];
    headers: string[];
  }> {
    try {
      const staff = await prisma.staff.findMany({
        include: {
          user: true,
          address: true
        }
      });

      const headers = [
        'Staff ID',
        'Name',
        'Email',
        'Role',
        'Designation',
        'Department',
        'Date of Birth',
        'Gender',
        'Contact Number',
        'Joining Date',
        'Qualification',
        'Present Address',
        'Permanent Address'
      ];

      const data = staff.map(staffMember => ({
        'Staff ID': staffMember.staffId,
        'Name': staffMember.name,
        'Email': staffMember.email,
        'Role': staffMember.user.role,
        'Designation': staffMember.designation,
        'Department': staffMember.department,
        'Date of Birth': staffMember.dateOfBirth.toISOString().split('T')[0],
        'Gender': staffMember.gender,
        'Contact Number': staffMember.contactNumber,
        'Joining Date': staffMember.joiningDate.toISOString().split('T')[0],
        'Qualification': staffMember.qualification,
        'Present Address': staffMember.address.presentAddress,
        'Permanent Address': staffMember.address.permanentAddress
      }));

      const filename = `staff_export_${Date.now()}.csv`;

      return {
        filename,
        data,
        headers
      };

    } catch (error) {
      console.error('Error exporting staff:', error);
      throw new Error('Failed to export staff');
    }
  }

  /**
   * Get bulk operation status
   */
  static async getOperationStatus(operationId: string): Promise<BulkOperationResult | null> {
    // Mock implementation - in production this would be stored in database
    console.log(`Getting status for operation: ${operationId}`);
    return null;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  }

  /**
   * Generate CSV content from data
   */
  static generateCSV(data: any[], headers: string[]): string {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Parse CSV content to data array
   */
  static parseCSV(csvContent: string): { headers: string[]; data: any[] } {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], data: [] };
    }

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return { headers, data };
  }
}
