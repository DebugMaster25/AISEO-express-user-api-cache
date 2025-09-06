import { User } from '../types';
import logger from '../utils/logger';

interface PendingRequest {
  resolve: (value: User) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class AsyncProcessor {
  private pendingRequests = new Map<number, PendingRequest[]>();
  private processingQueue: number[] = [];
  private isProcessing = false;
  private mockUsers: { [key: number]: User } = {
    1: { id: 1, name: "John Doe", email: "john@example.com" },
    2: { id: 2, name: "Jane Smith", email: "jane@example.com" },
    3: { id: 3, name: "Alice Johnson", email: "alice@example.com" }
  };

  async processUserRequest(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      // Check if there's already a pending request for this user
      if (this.pendingRequests.has(userId)) {
        this.pendingRequests.get(userId)!.push({ resolve, reject, timestamp: Date.now() });
        return;
      }

      // Create new pending request
      this.pendingRequests.set(userId, [{ resolve, reject, timestamp: Date.now() }]);
      this.processingQueue.push(userId);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const userId = this.processingQueue.shift()!;
      await this.processUser(userId);
    }

    this.isProcessing = false;
  }

  private async processUser(userId: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simulate database call with 200ms delay
      await this.simulateDatabaseCall();
      
      const user = this.mockUsers[userId];
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const responseTime = Date.now() - startTime;
      logger.info(`Processed user ${userId} in ${responseTime}ms`);

      // Resolve all pending requests for this user
      const pendingRequests = this.pendingRequests.get(userId) || [];
      pendingRequests.forEach(({ resolve }) => resolve(user));
      this.pendingRequests.delete(userId);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Failed to process user ${userId} after ${responseTime}ms:`, error);

      // Reject all pending requests for this user
      const pendingRequests = this.pendingRequests.get(userId) || [];
      pendingRequests.forEach(({ reject }) => reject(error as Error));
      this.pendingRequests.delete(userId);
    }
  }

  private async simulateDatabaseCall(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 200);
    });
  }

  // Add new user to mock data
  addUser(user: User): void {
    this.mockUsers[user.id] = user;
    logger.info(`Added new user: ${user.name} (ID: ${user.id})`);
  }

  // Get all users
  getAllUsers(): User[] {
    return Object.values(this.mockUsers);
  }

  // Check if user exists
  userExists(userId: number): boolean {
    return userId in this.mockUsers;
  }

  // Get processing statistics
  getStats(): { pendingRequests: number; queueLength: number; isProcessing: boolean } {
    return {
      pendingRequests: Array.from(this.pendingRequests.values()).reduce((sum, requests) => sum + requests.length, 0),
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }

  // Clean up expired pending requests (older than 30 seconds)
  cleanup(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds

    for (const [userId, requests] of this.pendingRequests.entries()) {
      const validRequests = requests.filter(req => now - req.timestamp < maxAge);
      
      if (validRequests.length === 0) {
        this.pendingRequests.delete(userId);
      } else if (validRequests.length < requests.length) {
        this.pendingRequests.set(userId, validRequests);
      }
    }
  }
}
