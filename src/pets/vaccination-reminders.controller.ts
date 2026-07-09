import {
  Controller,
  ForbiddenException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { VaccinationRemindersService } from './vaccination-reminders.service';

/**
 * Disparo manual del barrido de recordatorios, sólo para ADMIN.
 * Sirve para probarlo sin esperar al cron de las 08:00 (hora de Lima).
 * `?dryRun=true` lista a quién se avisaría, sin enviar ni registrar nada.
 */
@Controller('pets/vaccination-reminders')
@UseGuards(JwtAuthGuard)
export class VaccinationRemindersController {
  constructor(private readonly service: VaccinationRemindersService) {}

  @Post('run')
  run(@Req() req: any, @Query('dryRun') dryRun?: string) {
    const isAdmin = (req.user.roles || []).includes('1');
    if (!isAdmin) {
      throw new ForbiddenException('Solo un administrador puede lanzar el barrido');
    }
    return this.service.run(dryRun === 'true');
  }
}
