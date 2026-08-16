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
import { Announcement } from '../types/classroom';

/**
 * Service layer for managing classroom announcements.
 * Does not interact with any existing codebase functionality.
 */
class AnnouncementService {
  /**
   * Creates a new announcement
   */
  async createAnnouncement(data: Omit<Announcement, 'id'>): Promise<Announcement> {
    try {
      const announcementRef = doc(collection(db, 'announcements'));
      const now = new Date();

      const newAnnouncement: Announcement = {
        ...data,
        id: announcementRef.id,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(announcementRef, {
        ...newAnnouncement,
        scheduledAt: data.scheduledAt?.toISOString(),
        sentAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      return newAnnouncement;
    } catch (error) {
      console.error('Failed to create announcement:', error);
      throw error;
    }
  }

  /**
   * Gets an announcement by ID
   */
  async getAnnouncementById(announcementId: string): Promise<Announcement | null> {
    try {
      const snap = await getDoc(doc(db, 'announcements', announcementId));
      if (!snap.exists()) return null;

      const data = snap.data();
      return this.deserializeAnnouncementDoc(snap);
    } catch (error) {
      console.error('Failed to get announcement:', error);
      throw error;
    }
  }

  /**
   * Gets all announcements for a room
   */
  async getAnnouncementsByRoom(roomId: string): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('roomId', '==', roomId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.deserializeAnnouncementDoc(doc));
    } catch (error) {
      console.error('Failed to get announcements:', error);
      throw error;
    }
  }

  /**
   * Gets announcements for a room with status filter
   */
  async getAnnouncementsByRoomAndStatus(
    roomId: string,
    status: Announcement['status']
  ): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('roomId', '==', roomId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.deserializeAnnouncementDoc(doc));
    } catch (error) {
      console.error('Failed to get announcements:', error);
      throw error;
    }
  }

  /**
   * Updates an announcement
   */
  async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.scheduledAt) {
        updateData.scheduledAt = updates.scheduledAt.toISOString();
      }
      if (updates.sentAt) {
        updateData.sentAt = updates.sentAt.toISOString();
      }

      await updateDoc(doc(db, 'announcements', announcementId), updateData);
    } catch (error) {
      console.error('Failed to update announcement:', error);
      throw error;
    }
  }

  /**
   * Deletes an announcement
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      throw error;
    }
  }

  /**
   * Sends a scheduled announcement (changes status to sent)
   */
  async sendAnnouncement(announcementId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'announcements', announcementId), {
        status: 'sent',
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send announcement:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time announcement updates for a room
   */
  subscribeToAnnouncements(
    roomId: string,
    callback: (announcements: Announcement[]) => void
  ): () => void {
    const q = query(
      collection(db, 'announcements'),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const announcements = snapshot.docs.map((doc) => this.deserializeAnnouncementDoc(doc));
        callback(announcements);
      },
      (error: FirestoreError) => {
        console.error('Announcement listener error:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Gets recent announcements for a student (sent announcements only)
   */
  async getRecentAnnouncementsForStudent(
    roomId: string,
    limitCount: number = 5
  ): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('roomId', '==', roomId),
        where('status', '==', 'sent'),
        orderBy('sentAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limitCount)
        .map((doc) => this.deserializeAnnouncementDoc(doc));
    } catch (error) {
      console.error('Failed to get recent announcements:', error);
      throw error;
    }
  }

  /**
   * Converts Firestore document to Announcement object
   */
  private deserializeAnnouncementDoc(doc: any): Announcement {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      teacherId: data.teacherId,
      title: data.title,
      body: data.body,
      type: data.type,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      sentAt: new Date(data.sentAt),
      recipientCount: data.recipientCount,
      status: data.status,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}

export const announcementService = new AnnouncementService();