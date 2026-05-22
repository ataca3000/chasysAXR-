export interface OfflineTask {
  id: string;
  timestamp: number;
  machineId: string;
  action: string;
  payload?: any;
  status: 'pending' | 'completed' | 'failed';
}

const DB_NAME = 'GopilotOfflineDB';
const STORE_NAME = 'commandsQueue';

class OfflineSyncManager {
  private tasks: OfflineTask[] = [];
  public isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<() => void> = new Set();
  private db: IDBDatabase | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.initDB().then(() => this.loadTasks());
    }
  }

  private initDB(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = (event) => {
        console.error('IndexedDB connection error:', event);
        reject('Failed to open IndexedDB');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });

    return this.initializationPromise;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notify();
    this.flushQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.saveStatusToLocalStorage('offline');
    this.notify();
  };

  private saveStatusToLocalStorage(status: string) {
     try {
       localStorage.setItem('automata_network_status', JSON.stringify({ status, timestamp: Date.now() }));
     } catch (e) {
       console.error('localStorage error', e);
     }
  }

  private async loadTasks() {
    if (!this.db) await this.initDB();
    try {
      if (!this.db) return;
      return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          this.tasks = (request.result as OfflineTask[]) || [];
          this.notify();
          
          if (this.isOnline) {
             this.flushQueue();
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Error loading offline tasks from IndexedDB', e);
      // Fallback
      try {
        const stored = localStorage.getItem('automata_offline_tasks');
        if (stored) {
          this.tasks = JSON.parse(stored);
          this.notify();
        }
      } catch (err) {}
    }
  }

  private async saveTasks() {
    if (!this.db) await this.initDB();
    try {
      if (!this.db) return;
      // We do not overwrite everything in IndexedDB to save; instead we update/add in addTask/executeTask,
      // but for simplicity, we keep memory array synced to DB.
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear and rewrite (less efficient but syncs perfect with memory slice) or just use put
      await new Promise<void>((resolve, reject) => {
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
           let i = 0;
           const putNext = () => {
              if (i < this.tasks.length) {
                 store.put(this.tasks[i]).onsuccess = putNext;
                 i++;
              } else {
                 resolve();
              }
           };
           putNext();
        };
        clearReq.onerror = () => reject(clearReq.error);
      });

      this.saveStatusToLocalStorage('tasks_updated');
      this.notify();
    } catch (e) {
      console.error('Error saving to IndexedDB', e);
      // Fallback to localStorage for critical path if IDB fails
      try {
         localStorage.setItem('automata_offline_tasks', JSON.stringify(this.tasks));
      } catch(err) {}
      this.notify();
    }
  }

  public addTask(machineId: string, action: string, payload?: any) {
    const task: OfflineTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      machineId,
      action,
      payload,
      status: 'pending'
    };
    this.tasks.push(task);
    this.saveTasks();
    
    // Attempt to execute immediately if online
    if (this.isOnline) {
      this.executeTask(task);
    }
  }

  public getPendingTasks() {
    return this.tasks.filter(t => t.status === 'pending');
  }

  public getTasksByMachine(machineId: string) {
    return this.tasks.filter(t => t.machineId === machineId);
  }

  private async executeTask(task: OfflineTask) {
    try {
      // Import dynamically or execute the actual command
      const { hardware } = await import('./hardwareController');
      
      console.log(`[OfflineSync] Executing task ${task.action} on ${task.machineId}`);
      if (task.action === 'sendCommand' && task.payload?.gcode) {
         await hardware.sendCommand(task.payload.gcode, true);
      } else {
         // other actions or simulated async
         await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      task.status = 'completed';
      // remove completed task to save space
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      this.saveTasks();
    } catch (e) {
      console.error(`[OfflineSync] Task execution failed: ${task.id}`);
      // Leave as pending if it failed due to network
    }
  }

  public async flushQueue() {
    if (!this.isOnline) return;

    const pending = this.getPendingTasks();
    for (const task of pending) {
       await this.executeTask(task);
    }
  }
}

export const offlineSync = new OfflineSyncManager();
