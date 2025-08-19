import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IVariant extends Document {
  name: string;
  imageUrl?: string;
  images?: { car?: string };
  rkid?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    series?: string;
    yearRange?: string;
    keyType?: string;
    transponderChip?: string[];
    transponderChipLinks?: string[];
    remoteFrequency?: string;
    KingParts?: string[];
    KingPartsLinks?: string[];
    Lishi?: string;
    LishiLink?: string;
  };
  keyBladeProfiles?: Record<string, { refNo?: string; link?: string }>;
  programmingInfo?: {
    remoteOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    keyBladeOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    cloningOptions?: Array<{ name?: string; models?: string[]; Color?: string }>;
    allKeysLost?: Array<{ name?: string; models?: string[]; Color?: string }>;
    addSpareKey?: Array<{ name?: string; models?: string[]; Color?: string }>;
    addRemote?: Array<{ name?: string; models?: string[]; Color?: string }>;
    pinRequired?: Array<{ name?: string; models?: string[]; Color?: string }>;
    pinReading?: Array<{ name?: string; models?: string[]; Color?: string }>;
    remoteProgramming?: Array<{ name?: string; models?: string[]; Color?: string }>;
  };
  pathways?: Array<{ name?: string; path?: string }>;
  resources?: {
    quickReference?: { emergencyStart?: string; obdPortLocation?: string };
    videos?: Array<{ title?: string; embedId?: string }>;
    documents?: Array<{ title?: string; link?: string }>;
  };
  brandId: mongoose.Types.ObjectId;
  modelId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: false },
    images: {
      car: { type: String, required: false },
    },
    rkid: { type: String },
    vehicleInfo: {
      make: String,
      model: String,
      series: String,
      yearRange: String,
      keyType: String,
      transponderChip: [String],
      transponderChipLinks: [String],
      remoteFrequency: String,
      KingParts: [String],
      KingPartsLinks: [String],
      Lishi: String,
      LishiLink: String,
    },
    keyBladeProfiles: { type: Schema.Types.Mixed },
    programmingInfo: {
      remoteOptions: [{ name: String, models: [String], Color: String }],
      keyBladeOptions: [{ name: String, models: [String], Color: String }],
      cloningOptions: [{ name: String, models: [String], Color: String }],
      allKeysLost: [{ name: String, models: [String], Color: String }],
      addSpareKey: [{ name: String, models: [String], Color: String }],
      addRemote: [{ name: String, models: [String], Color: String }],
      pinRequired: [{ name: String, models: [String], Color: String }],
      pinReading: [{ name: String, models: [String], Color: String }],
      remoteProgramming: [{ name: String, models: [String], Color: String }],
    },
    pathways: [{ name: String, path: String }],
    resources: {
      quickReference: {
        emergencyStart: String,
        obdPortLocation: String,
      },
      videos: [{ title: String, embedId: String }],
      documents: [{ title: String, link: String }],
    },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    modelId: { type: Schema.Types.ObjectId, ref: 'Model', required: true, index: true },
  },
  { timestamps: true }
);

export default models.Variant || model<IVariant>('Variant', VariantSchema);
