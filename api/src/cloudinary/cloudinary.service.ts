import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'tutorconnect/tutors',
  ): Promise<UploadApiResponse> {
    if (
      !this.config.get('CLOUDINARY_CLOUD_NAME') ||
      !this.config.get('CLOUDINARY_API_KEY') ||
      !this.config.get('CLOUDINARY_API_SECRET')
    ) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: true,
          transformation: [{ width: 800, height: 800, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                error?.message ?? 'Cloudinary upload failed',
              ),
            );
            return;
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(stream);
    });
  }

  async uploadRawPdf(
    buffer: Buffer,
    fileName: string,
    folder = 'tutorconnect/agreements',
  ): Promise<UploadApiResponse> {
    if (
      !this.config.get('CLOUDINARY_CLOUD_NAME') ||
      !this.config.get('CLOUDINARY_API_KEY') ||
      !this.config.get('CLOUDINARY_API_SECRET')
    ) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw',
          public_id: fileName.replace(/\.pdf$/i, ''),
          format: 'pdf',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                error?.message ?? 'Cloudinary PDF upload failed',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  async uploadDocument(
    file: Express.Multer.File,
    folder = 'tutorconnect/verification',
  ): Promise<UploadApiResponse> {
    if (
      !this.config.get('CLOUDINARY_CLOUD_NAME') ||
      !this.config.get('CLOUDINARY_API_KEY') ||
      !this.config.get('CLOUDINARY_API_SECRET')
    ) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }

    const isPdf = file.mimetype === 'application/pdf';
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isPdf ? 'raw' : 'auto',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                error?.message ?? 'Cloudinary document upload failed',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(stream);
    });
  }
}
