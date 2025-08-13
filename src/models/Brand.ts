import mongoose, { Document, Schema } from 'mongoose';

interface IBrand extends Document {
  name: string;
  logoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      unique: true,
      index: true,
    },
    logoUrl: {
      type: String,
      required: [true, 'Logo URL is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Add case-insensitive index for better duplicate checking
BrandSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Create a model or retrieve the existing one to prevent OverwriteModelError
const Brand = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
export type { IBrand };
