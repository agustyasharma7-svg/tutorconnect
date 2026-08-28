import './instrument';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/sentry-exception.filter';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd && (!corsOrigin || corsOrigin.length === 0)) {
    throw new Error('CORS_ORIGIN is required when NODE_ENV=production');
  }
  if (isProd) {
    const access = process.env.JWT_ACCESS_SECRET?.trim();
    const refresh = process.env.JWT_REFRESH_SECRET?.trim();
    if (!access || !refresh) {
      throw new Error(
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required when NODE_ENV=production',
      );
    }
    if (
      access.includes('change-me') ||
      refresh.includes('change-me') ||
      access.includes('dev-access') ||
      refresh.includes('dev-refresh')
    ) {
      throw new Error('JWT secrets must not use development placeholders in production');
    }
    if (process.env.PAYMENTS_MOCK === 'true') {
      throw new Error(
        'PAYMENTS_MOCK must not be true when NODE_ENV=production',
      );
    }
    if (!process.env.DOCUMENT_ENCRYPTION_KEY?.trim()) {
      throw new Error(
        'DOCUMENT_ENCRYPTION_KEY is required when NODE_ENV=production',
      );
    }
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(adapterHost));
  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : 'http://localhost:3000',
    credentials: true,
  });

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('TutorConnect India API')
      .setDescription('MVP API — Phase 6 / 7 hardening')
      .setVersion('0.7.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  if (!isProd) {
    console.log(`Swagger: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
