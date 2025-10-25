import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = (configService: ConfigService): MongooseModuleOptions => {
  const mongoUri = configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/hotel_meducin_db';
  console.log('MongoDB URI:', mongoUri);
  
  return {
    uri: mongoUri,
  };
};
