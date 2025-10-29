export class RoomResponseDto {
  _id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  bedType: string;
  imageUrls: string[];
  amenities: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
