import { Controller, Post,Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { registerAuthDto } from './dto/register-auth-dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){

        }
    @Post('register')//htpp://localhost:3000/auth/register
    register(@Body() user:registerAuthDto){
        return this.authService.register(user);
    }
    @Post('login') // http://localhost:3000/auth/login -> POST 
    login(@Body() loginData: LoginAuthDto) {
        return this.authService.login(loginData);
    }

    // 🔍 Verificar si un correo ya existe
    @Post('check-email') // http://localhost:3000/auth/check-email -> POST
    checkEmail(@Body('email') email: string) {
        return this.authService.checkEmail(email);
    }

    // 🔐 Solicitar recuperación de contraseña
    @Post('forgot-password') // http://localhost:3000/auth/forgot-password -> POST
    forgotPassword(@Body('email') email: string) {
        return this.authService.requestPasswordReset(email);
    }

    // 🔄 Resetear contraseña con token
    @Post('reset-password') // http://localhost:3000/auth/reset-password -> POST
    resetPassword(
        @Body('token') token: string,
        @Body('password') password: string,
    ) {
        return this.authService.resetPassword(token, password);
    }
}

