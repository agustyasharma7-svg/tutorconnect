import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterStudentDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  mobile!: string;

  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'en', enum: ['en', 'hi'] })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class RegisterTutorDto extends RegisterStudentDto {
  @ApiProperty({ example: 'M.Sc Mathematics' })
  @IsString()
  @MinLength(2)
  qualification!: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: ['login', 'register', 'reset'] })
  @IsOptional()
  @IsString()
  purpose?: 'login' | 'register' | 'reset';
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class SetPasswordDto {
  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain letters and numbers',
  })
  password!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain letters and numbers',
  })
  password!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    mobile: string;
    name: string;
    role: UserRole;
    status: string;
    locale: string;
  };
}
