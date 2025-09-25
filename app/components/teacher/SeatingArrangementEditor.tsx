'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  profilePicture?: string;
}

interface Seat {
  id: string;
  row: number;
  col: number;
  studentId?: string;
  student?: Student;
  label?: string;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

interface SeatingArrangementEditorProps {
  arrangement?: {
    name: string;
    classId: string;
    layout: {
      rows: number;
      cols: number;
      seats: Array<{
        row: number;
        col: number;
        studentId?: string;
        student?: Student;
        label?: string;
      }>;
    };
  } | null;
  classId?: string | null;
  onSave: (data: {
    name: string;
    classId: string;
    layout: any;
    rows: number;
    columns: number;
  }) => void;
  onCancel: () => void;
}

export function SeatingArrangementEditor({
  arrangement,
  classId,
  onSave,
  onCancel,
}: SeatingArrangementEditorProps) {
  const [name, setName] = useState(arrangement?.name || '');
  const [selectedClassId, setSelectedClassId] = useState(classId || arrangement?.classId || '');
  const [rows, setRows] = useState(arrangement?.layout?.rows || 6);
  const [cols, setCols] = useState(arrangement?.layout?.cols || 8);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    }
  }, [selectedClassId]);

  useEffect(() => {
    initializeSeats();
  }, [rows, cols, arrangement]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/teacher/classes/${selectedClassId}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const initializeSeats = () => {
    const newSeats: Seat[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seatId = `${row}-${col}`;
        const existingSeat = arrangement?.layout?.seats?.find(
          (s) => s.row === row && s.col === col
        );
        
        newSeats.push({
          id: seatId,
          row,
          col,
          studentId: existingSeat?.studentId,
          student: existingSeat?.student,
          label: existingSeat?.label || `${String.fromCharCode(65 + row)}${col + 1}`,
        });
      }
    }
    
    setSeats(newSeats);
  };

  const handleDragStart = (student: Student) => {
    setDraggedStudent(student);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, seatId: string) => {
    e.preventDefault();
    
    if (!draggedStudent) return;
    
    setSeats(prevSeats => 
      prevSeats.map(seat => {
        if (seat.id === seatId) {
          return {
            ...seat,
            studentId: draggedStudent.id,
            student: draggedStudent,
          };
        }
        // Remove student from previous seat
        if (seat.studentId === draggedStudent.id) {
          return {
            ...seat,
            studentId: undefined,
            student: undefined,
          };
        }
        return seat;
      })
    );
    
    setDraggedStudent(null);
  };

  const handleRemoveStudent = (seatId: string) => {
    setSeats(prevSeats =>
      prevSeats.map(seat =>
        seat.id === seatId
          ? { ...seat, studentId: undefined, student: undefined }
          : seat
      )
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name for the seating arrangement');
      return;
    }
    
    if (!selectedClassId) {
      alert('Please select a class');
      return;
    }

    const arrangementData = {
      name: name.trim(),
      classId: selectedClassId,
      layout: {
        rows,
        cols,
        seats: seats.map(seat => ({
          row: seat.row,
          col: seat.col,
          studentId: seat.studentId,
          label: seat.label,
        })),
      },
      rows,
      columns: cols,
    };

    onSave(arrangementData);
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assignedStudentIds = new Set(seats.filter(seat => seat.studentId).map(seat => seat.studentId));
  const unassignedStudents = filteredStudents.filter(student => !assignedStudentIds.has(student.id));

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Arrangement Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter arrangement name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} - {cls.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Size Controls */}
      <div className="flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rows
          </label>
          <input
            type="number"
            min="3"
            max="10"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Columns
          </label>
          <input
            type="number"
            min="4"
            max="12"
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Students
          </h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unassignedStudents.map((student) => (
              <div
                key={student.id}
                draggable
                onDragStart={() => handleDragStart(student)}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {student.firstName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Roll: {student.rollNumber}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seating Grid */}
        <div className="lg:col-span-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Classroom Layout
          </h3>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <div className="mb-4 text-center">
              <div className="inline-block bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium">
                Teacher&apos;s Desk
              </div>
            </div>
            
            <div 
              className="grid gap-2"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }}
            >
              {seats.map((seat) => (
                <div
                  key={seat.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, seat.id)}
                  className={`
                    relative w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md
                    flex items-center justify-center text-xs font-medium
                    ${seat.student ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700'}
                    hover:border-blue-400 dark:hover:border-blue-500 transition-colors
                  `}
                >
                  {seat.student ? (
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium mx-auto mb-1">
                        {seat.student.firstName.charAt(0)}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                        {seat.student.firstName}
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(seat.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      {seat.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Arrangement
        </Button>
      </div>
    </div>
  );
}
