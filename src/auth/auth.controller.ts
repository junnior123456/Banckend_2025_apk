import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { registerAuthDto } from './dto/register-auth-dto';
import { LoginAuthDto } from './dto/login-auth.dto';

/**
 * Límites por IP y por minuto. Son generosos para un humano (nadie se registra
 * 15 veces por minuto) y asfixiantes para un bot. Ojo: una red compartida
 * (wifi de universidad) sale con una sola IP pública, de ahí que no sean 3.
 *
 * AUTH_THROTTLE_LIMIT los sube en una instancia de pruebas para poder medir la
 * capacidad real del servidor. En producción NO se define: mandan estos valores.
 */
const lim = (porDefecto: number) => Number(process.env.AUTH_THROTTLE_LIMIT || porDefecto);

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){

        }
    @Throttle({ default: { limit: lim(15), ttl: 60_000 } })
    @Post('register')//htpp://localhost:3000/auth/register
    register(@Body() user:registerAuthDto){
        return this.authService.register(user);
    }

    // Fuerza bruta de contraseñas: el límite bajo es la defensa principal.
    @Throttle({ default: { limit: lim(10), ttl: 60_000 } })
    @Post('login') // http://localhost:3000/auth/login -> POST
    login(@Body() loginData: LoginAuthDto) {
        return this.authService.login(loginData);
    }

    // 🔵 Login/registro con Google (la app manda el idToken de google_sign_in)
    @Throttle({ default: { limit: lim(15), ttl: 60_000 } })
    @Post('google') // http://localhost:3000/auth/google -> POST
    loginGoogle(@Body('idToken') idToken: string) {
        return this.authService.loginWithGoogle(idToken);
    }

    // 🔍 Verificar si un correo ya existe
    // Enumeración de cuentas: sin límite, permite descubrir qué correos existen.
    @Throttle({ default: { limit: lim(20), ttl: 60_000 } })
    @Post('check-email') // http://localhost:3000/auth/check-email -> POST
    checkEmail(@Body('email') email: string) {
        return this.authService.checkEmail(email);
    }

    // 🔐 Solicitar recuperación de contraseña
    // Cada llamada manda un correo: sin límite es un cañón de spam gratis.
    @Throttle({ default: { limit: lim(5), ttl: 60_000 } })
    @Post('forgot-password') // http://localhost:3000/auth/forgot-password -> POST
    forgotPassword(@Body('email') email: string) {
        return this.authService.requestPasswordReset(email);
    }

    // 🔄 Resetear contraseña con token
    @Throttle({ default: { limit: lim(10), ttl: 60_000 } })
    @Post('reset-password') // http://localhost:3000/auth/reset-password -> POST
    resetPassword(
        @Body('token') token: string,
        @Body('password') password: string,
    ) {
        return this.authService.resetPassword(token, password);
    }
}
