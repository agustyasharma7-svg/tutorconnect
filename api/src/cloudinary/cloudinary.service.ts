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

  private assertConfigured() {
    if (
      !this.config.get('CLOUDINARY_CLOUD_NAME') ||
      !this.config.get('CLOUDINARY_API_KEY') ||
      !this.config.get('CLOUDINARY_API_SECRET')
    ) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }
  }

  /**
   * Short-lived signed URL for authenticated (private) Cloudinary assets.
   * Prefer storing public_id in DB and signing on read — never expose permanent public URLs for KYC.
   */
  signedUrl(
    publicId: string,
    opts?: {
      resourceType?: 'image' | 'raw' | 'auto';
      expiresInSeconds?: number;
    },
  ): string {
    this.assertConfigured();
    const expiresIn = opts?.expiresInSeconds ?? 300;
    const resourceType = opts?.resourceType ?? 'auto';
    return cloudinary.url(publicId, {
      type: 'authenticated',
      resource_type: resourceType === 'auto' ? 'image' : resourceType,
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'tutorconnect/tutors',
  ): Promise<UploadApiResponse> {
    this.assertConfigured();

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
    authenticated = true,
  ): Promise<UploadApiResponse> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw',
          type: authenticated ? 'authenticated' : 'upload',
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
    authenticated = true,
  ): Promise<UploadApiResponse> {
    this.assertConfigured();

    const isPdf = file.mimetype === 'application/pdf';
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isPdf ? 'raw' : 'image',
          type: authenticated ? 'authenticated' : 'upload',
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
