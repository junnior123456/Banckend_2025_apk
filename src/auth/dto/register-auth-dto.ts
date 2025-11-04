import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class registerAuthDto{
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    lastname:string;

    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email:string;

    @IsNotEmpty()
    @IsString()
    phone: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, {message:'ingrese 6 caracteres'})
    password: string;

    rolesIds: string[];
    
}