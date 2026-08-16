import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { Attendance, AttendanceType } from '../types/classroom';

/**
 * Service layer for managing classroom attendance.
 * Does not interact with any existing codebase functionality.
 */
class AttendanceService {
  /**
   * Creates a new attendance record
   */
  async createAttendance(data: Omit<Attendance, 'id'>): Promise<Attendance> {
    try {
      const attendanceRef = doc(collection(db, 'attendance'));
      const now = new Date();

      const newAttendance: Attendance = {
        ...data,
        id: attendanceRef.id,
        createdAt: now,
      };

      await setDoc(attendanceRef, {
        ...newAttendance,
        date: data.date.toISOString(),
        createdAt: now.toISOString(),
      });

      return newAttendance;
    } catch (error) {
      console.error('Failed to create attendance:', error);
      throw error;
    }
  }

  /**
   * Gets attendance records for a room on a specific date
   */
  async getAttendanceByRoomAndDate(
    roomId: string,
    date: Date,
    type?: AttendanceType
  ): Promise<Attendance[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'attendance'),
        where('roomId', '==', roomId),
        where('date', '>=', startOfDay.toISOString()),
        where('date', '<=', endOfDay.toISOString()),
        orderBy('date', 'asc')
      );

      const snapshot = await getDocs(q);
      let records = snapshot.docs.map((doc) => this.deserializeAttendanceDoc(doc));

      if (type) {
        records = records.filter((a) => a.type === type);
      }

      return records;
    } catch (error) {
      console.error('Failed to get attendance:', error);
      throw error;
    }
  }

  /**
   * Gets attendance records for a specific student
   */
  async getStudentAttendance(
    roomId: string,
    studentId: string
  ): Promise<Attendance[]> {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('roomId', '==', roomId),
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.deserializeAttendanceDoc(doc));
    } catch (error) {
      console.error('Failed to get student attendance:', error);
      throw error;
    }
  }

  /**
   * Updates an attendance record
   */
  async updateAttendance(
    attendanceId: string,
    updates: Partial<Attendance>
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.date) {
        updateData.date = updates.date.toISOString();
      }

      await updateDoc(doc(db, 'attendance', attendanceId), updateData);
    } catch (error) {
      console.error('Failed to update attendance:', error);
      throw error;
    }
  }

  /**
   * Bulk creates attendance records (for teacher marking multiple students)
   */
  async bulkCreateAttendance(
    records: Omit<Attendance, 'id'>[]
  ): Promise<Attendance[]> {
    try {
      const newRecords: Attendance[] = [];

      for (const data of records) {
        const attendanceRef = doc(collection(db, 'attendance'));
        const now = new Date();

        const newAttendance: Attendance = {
          ...data,
          id: attendanceRef.id,
          createdAt: now,
        };

        await setDoc(attendanceRef, {
          ...newAttendance,
          date: data.date.toISOString(),
          createdAt: now.toISOString(),
        });

        newRecords.push(newAttendance);
      }

      return newRecords;
    } catch (error) {
      console.error('Failed to bulk create attendance:', error);
      throw error;
    }
  }

  /**
   * Gets attendance statistics for a room
   */
  async getAttendanceStats(
    roomId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  }> {
    try {
      let q = query(
        collection(db, 'attendance'),
        where('roomId', '==', roomId)
      );

      if (startDate) {
        q = query(q, where('date', '>=', startDate.toISOString()));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate.toISOString()));
      }

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map((doc) => this.deserializeAttendanceDoc(doc));

      const totalRecords = records.length;
      const presentCount = records.filter((r) => r.status === 'present').length;
      const absentCount = records.filter((r) => r.status === 'absent').length;
      const lateCount = records.filter((r) => r.status === 'late').length;
      const excusedCount = records.filter((r) => r.status === 'excused').length;
      const attendanceRate = totalRecords > 0
        ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
        : 0;

      return {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
      };
    } catch (error) {
      console.error('Failed to get attendance stats:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time attendance updates for a room and date
   */
  subscribeToAttendance(
    roomId: string,
    date: Date,
    callback: (attendance: Attendance[]) => void
  ): () => void {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'attendance'),
      where('roomId', '==', roomId),
      where('date', '>=', startOfDay.toISOString()),
      where('date', '<=', endOfDay.toISOString()),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const attendance = snapshot.docs.map((doc) => this.deserializeAttendanceDoc(doc));
        callback(attendance);
      },
      (error: FirestoreError) => {
        console.error('Attendance listener error:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Checks if a student has already checked in for a session
   */
  async hasCheckedIn(
    roomId: string,
    studentId: string,
    date: Date,
    type: AttendanceType
  ): Promise<Attendance | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'attendance'),
        where('roomId', '==', roomId),
        where('studentId', '==', studentId),
        where('type', '==', type),
        where('date', '>=', startOfDay.toISOString()),
        where('date', '<=', endOfDay.toISOString())
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return this.deserializeAttendanceDoc(snapshot.docs[0]);
    } catch (error) {
      console.error('Failed to check attendance:', error);
      return null;
    }
  }

  /**
   * Student check-in
   */
  async checkIn(data: Omit<Attendance, 'id' | 'createdAt'>): Promise<Attendance> {
    const existing = await this.hasCheckedIn(data.roomId, data.studentId, data.date, data.type);
    if (existing) {
      throw new Error('Already checked in for this session');
    }
    return this.createAttendance({ ...data, status: 'present', createdAt: new Date() });
  }

  /**
   * Teacher marks attendance for a student
   */
  async markAttendance(
    roomId: string,
    studentId: string,
    date: Date,
    type: AttendanceType,
    status: Attendance['status'],
    verifiedBy: string
  ): Promise<Attendance> {
    const existing = await this.hasCheckedIn(roomId, studentId, date, type);
    if (existing) {
      await this.updateAttendance(existing.id, { status, verifiedBy });
      return { ...existing, status, verifiedBy };
    }
    return this.createAttendance({
      roomId,
      studentId,
      date,
      type,
      status,
      verifiedBy,
      createdAt: new Date(),
    });
  }

  /**
   * Converts Firestore document to Attendance object
   */
  private deserializeAttendanceDoc(doc: any): Attendance {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      studentId: data.studentId,
      date: new Date(data.date),
      type: data.type as AttendanceType,
      status: data.status,
      verifiedBy: data.verifiedBy,
      createdAt: new Date(data.createdAt),
    };
  }
}

export const attendanceService = new AttendanceService();