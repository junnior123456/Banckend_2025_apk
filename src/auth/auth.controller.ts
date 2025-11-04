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
}
