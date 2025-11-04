import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRolDto {

    @IsNotEmpty()
    @IsString()
    id: string;

    @IsNotEmpty()
    @IsString()
    name: string;
    
    
    @IsNotEmpty()
    @IsString()
    image: string;
    
    @IsOptional()
    @IsString()
    route: string;

}