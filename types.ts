export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE_GENERATION_RESULT = 'image_generation_result',
  ERROR = 'error'
}

export interface Attachment {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: Role;
  type: MessageType;
  content: string; // Text content or Base64 string for generated images
  attachments?: Attachment[]; // User uploaded files/images
  timestamp: number;
}

export enum AppMode {
  CHAT = 'chat',
  GENERATE_IMAGE = 'generate_image'
}
