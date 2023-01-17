import mongoose, { Mongoose } from 'mongoose';
import { IDBService } from '../relayer-node-interfaces/IDBService';

export class Mongo implements IDBService {
  private static instance: Mongo;

  private client: Mongoose | null;
  private dbUrl: string;

  private constructor(dbUrl: string) {
    this.client = null;
    this.dbUrl = dbUrl;
  }
  isConnected(): boolean {
    throw new Error('Method not implemented.');
  }

  public static getInstance(dbUrl: string): Mongo {
    if (!Mongo.instance) {
      Mongo.instance = new Mongo(dbUrl);
    }
    return Mongo.instance;
  }

  public getClient() {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    return this.client;
  }

  connect = async () => {
    try {
      if (!this.client) {
        this.client = await mongoose.connect(this.dbUrl, {
          dbName: 'relayer-node-service',
        });
      }
    } catch (error) {
      throw error;
    }
  };

  close() {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    return this.client.disconnect();
  }
}
