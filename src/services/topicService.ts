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
import { Topic, TopicStatus, TopicContent } from '../types/classroom';

export interface TopicProgress {
  id: string;
  userId: string;
  topicId: string;
  roomId: string;
  progress: number;
  completed: boolean;
  lastSection?: string;
  timeSpent: number;
  updatedAt: Date;
}

/**
 * Service layer for managing classroom topics.
 * Does not interact with any existing codebase functionality.
 */
class TopicService {
  /**
   * Creates a new topic in a classroom room
   */
  async createTopic(data: Omit<Topic, 'id'>): Promise<Topic> {
    try {
      const topicRef = doc(collection(db, 'topics'));
      const now = new Date();

      const newTopic: Topic = {
        ...data,
        id: topicRef.id,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
      };

      await setDoc(topicRef, {
        ...newTopic,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        sourceFiles: data.sourceFiles?.map((f) => ({
          ...f,
          uploadedAt: f.uploadedAt.toISOString(),
        })),
        aiContent: undefined,
      });

      // Update room topic count
      await this.updateRoomTopicCount(data.roomId);

      return newTopic;
    } catch (error) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  }

  /**
   * Retrieves a topic by ID
   */
  async getTopicById(topicId: string): Promise<Topic | null> {
    try {
      const topicSnap = await getDoc(doc(db, 'topics', topicId));
      if (!topicSnap.exists()) return null;

      return this.deserializeTopic(topicSnap);
    } catch (error) {
      console.error('Failed to get topic:', error);
      throw error;
    }
  }

  /**
   * Gets all topics for a room, ordered by their 'order' field
   */
  async getTopicsByRoom(roomId: string): Promise<Topic[]> {
    try {
      const q = query(
        collection(db, 'topics'),
        where('roomId', '==', roomId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => this.deserializeTopicDoc(doc));
    } catch (error) {
      console.error('Failed to get topics:', error);
      throw error;
    }
  }

  /**
   * Updates a topic
   */
  async updateTopic(topicId: string, updates: Partial<Topic>): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.sourceFiles) {
        updateData.sourceFiles = updates.sourceFiles.map((f) => ({
          ...f,
          uploadedAt: f.uploadedAt.toISOString(),
        }));
      }

      if (updates.aiContent) {
        updateData.aiContent = updates.aiContent;
      }

      await updateDoc(doc(db, 'topics', topicId), updateData);
    } catch (error) {
      console.error('Failed to update topic:', error);
      throw error;
    }
  }

  /**
   * Sets AI-generated content for a topic (as draft)
   */
  async setAiContent(topicId: string, content: TopicContent): Promise<void> {
    try {
      await updateDoc(doc(db, 'topics', topicId), {
        aiContent: content,
        lastGeneratedAt: new Date().toISOString(),
        status: 'draft',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to set AI content:', error);
      throw error;
    }
  }

  /**
   * Publishes a topic (changes status from draft to published)
   */
  async publishTopic(topicId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'topics', topicId), {
        status: 'published',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update room published count
      const topic = await this.getTopicById(topicId);
      if (topic) {
        await this.updateRoomTopicCount(topic.roomId);
      }
    } catch (error) {
      console.error('Failed to publish topic:', error);
      throw error;
    }
  }

  /**
   * Archives a topic
   */
  async archiveTopic(topicId: string): Promise<void> {
    await this.updateTopic(topicId, { status: 'archived' });
  }

  /**
   * Deletes a topic
   */
  async deleteTopic(topicId: string, roomId?: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'topics', topicId));
      if (roomId) {
        await this.updateRoomTopicCount(roomId);
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
      throw error;
    }
  }

  /**
   * Updates the order of topics within a room
   */
  async reorderTopics(roomId: string, orderedTopicIds: string[]): Promise<void> {
    try {
      const batch = [];
      for (let i = 0; i < orderedTopicIds.length; i++) {
        const topicRef = doc(db, 'topics', orderedTopicIds[i]);
        batch.push(
          updateDoc(topicRef, { order: i })
        );
      }
      await Promise.all(batch);
    } catch (error) {
      console.error('Failed to reorder topics:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time topic updates for a room
   */
  subscribeToTopics(
    roomId: string,
    callback: (topics: Topic[]) => void
  ): () => void {
    const q = query(
      collection(db, 'topics'),
      where('roomId', '==', roomId),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const topics = snapshot.docs.map((doc) => this.deserializeTopicDoc(doc));
        callback(topics);
      },
      (error: FirestoreError) => {
        console.error('Topic listener error:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Gets the next available order number for new topics
   */
  async getNextOrder(roomId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'topics'),
        where('roomId', '==', roomId),
        orderBy('order', 'desc')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return 0;

      const lastTopic = snapshot.docs[0].data();
      return (lastTopic.order ?? 0) + 1;
    } catch (error) {
      console.error('Failed to get next order:', error);
      return 0;
    }
  }

  /**
   * Updates topic statistics on the room document
   */
  private async updateRoomTopicCount(roomId: string): Promise<void> {
    try {
      const topics = await this.getTopicsByRoom(roomId);
      const published = topics.filter((t) => t.status === 'published').length;

      await updateDoc(doc(db, 'classroomRooms', roomId), {
        totalTopics: topics.length,
        topicsPublished: published,
      });
    } catch (error) {
      console.error('Failed to update room topic count:', error);
    }
  }

  /**
   * Converts Firestore document to Topic object
   */
  private deserializeTopicDoc(snap: any): Topic {
    const data = snap.data();
    return {
      id: snap.id,
      title: data.title,
      description: data.description,
      sourceFiles: data.sourceFiles?.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
      })),
      status: data.status as TopicStatus,
      order: data.order,
      createdBy: data.createdBy,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      aiContent: data.aiContent,
      lastGeneratedAt: data.lastGeneratedAt ? new Date(data.lastGeneratedAt) : undefined,
      roomId: data.roomId,
    };
  }

  private deserializeTopic(snap: any): Topic {
    const data = snap.data();
    if (!data) return null as any;

    return {
      id: snap.id,
      title: data.title,
      description: data.description,
      sourceFiles: data.sourceFiles?.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
      })),
      status: data.status as TopicStatus,
      order: data.order,
      createdBy: data.createdBy,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      aiContent: data.aiContent,
      lastGeneratedAt: data.lastGeneratedAt ? new Date(data.lastGeneratedAt) : undefined,
      roomId: data.roomId,
    };
  }

  /**
   * Gets student progress for all topics in a room
   */
  async getStudentProgress(roomId: string): Promise<TopicProgress[]> {
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) return [];

      const q = query(
        collection(db, 'topicProgress'),
        where('roomId', '==', roomId),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          topicId: data.topicId,
          roomId: data.roomId,
          progress: data.progress ?? 0,
          completed: data.completed ?? false,
          lastSection: data.lastSection,
          timeSpent: data.timeSpent ?? 0,
          updatedAt: new Date(data.updatedAt),
        };
      });
    } catch (error) {
      console.error('Failed to get student progress:', error);
      return [];
    }
  }

  /**
   * Updates student progress for a topic
   */
  async updateStudentProgress(
    roomId: string,
    topicId: string,
    progress: Partial<TopicProgress>
  ): Promise<void> {
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) throw new Error('User not authenticated');

      const progressRef = doc(db, 'topicProgress', `${user.uid}_${topicId}`);
      await setDoc(progressRef, {
        userId: user.uid,
        topicId,
        roomId,
        progress: progress.progress ?? 0,
        completed: progress.completed ?? false,
        lastSection: progress.lastSection,
        timeSpent: progress.timeSpent ?? 0,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Failed to update student progress:', error);
      throw error;
    }
  }

  /**
   * Gets progress for a specific topic
   */
  async getTopicProgress(roomId: string, topicId: string): Promise<TopicProgress | null> {
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (!user) return null;

      const progressRef = doc(db, 'topicProgress', `${user.uid}_${topicId}`);
      const snap = await getDoc(progressRef);
      if (!snap.exists()) return null;

      const data = snap.data();
      return {
        id: snap.id,
        userId: data.userId,
        topicId: data.topicId,
        roomId: data.roomId,
        progress: data.progress ?? 0,
        completed: data.completed ?? false,
        lastSection: data.lastSection,
        timeSpent: data.timeSpent ?? 0,
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error) {
      console.error('Failed to get topic progress:', error);
      return null;
    }
  }
}

export const topicService = new TopicService();
