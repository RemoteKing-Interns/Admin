import mongoose, { Document, Schema } from 'mongoose';

interface IModel extends Document {
  name: string;
  brandId: mongoose.Types.ObjectId;
  imageUrl: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ModelSchema = new Schema<IModel>(
  {
    name: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand ID is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for brandId and name to ensure uniqueness within a brand
ModelSchema.index(
  { brandId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Create a model or retrieve the existing one to prevent OverwriteModelError
const Model = mongoose.models.Model || mongoose.model<IModel>('Model', ModelSchema);

export default Model;
export type { IModel };
