import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettingsDocument extends Document {
  category: string;
  key: string;
  value: any;
  description?: string;
  isSecret?: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettingsModel extends Model<ISettingsDocument> {
  getSetting(category: string, key: string): Promise<any>;
  setSetting(category: string, key: string, value: any, updatedBy?: string, description?: string): Promise<ISettingsDocument>;
  getCategorySettings(category: string): Promise<Record<string, any>>;
}

const settingsSchema = new Schema<ISettingsDocument>({
  category: {
    type: String,
    required: true,
    index: true,
    enum: ['email', 'general', 'security', 'integrations', 'appearance']
  },
  key: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

settingsSchema.index({ category: 1, key: 1 }, { unique: true });

settingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get a setting
settingsSchema.statics.getSetting = async function(category: string, key: string) {
  const setting = await this.findOne({ category, key });
  return setting?.value;
};

// Static method to set a setting
settingsSchema.statics.setSetting = async function(category: string, key: string, value: any, updatedBy?: string, description?: string) {
  return this.findOneAndUpdate(
    { category, key },
    { 
      value, 
      updatedBy,
      description,
      updatedAt: new Date() 
    },
    { upsert: true, new: true }
  );
};

// Static method to get all settings in a category
settingsSchema.statics.getCategorySettings = async function(category: string) {
  const settings = await this.find({ category });
  const result: Record<string, any> = {};
  
  settings.forEach(setting => {
    // Don't expose secret values in full
    if (setting.isSecret && setting.value) {
      result[setting.key] = '********';
    } else {
      result[setting.key] = setting.value;
    }
  });
  
  return result;
};

export const Settings = mongoose.model<ISettingsDocument, ISettingsModel>('Settings', settingsSchema);