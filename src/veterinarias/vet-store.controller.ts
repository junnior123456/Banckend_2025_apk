import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { VetStoreService } from './vet-store.service';
import { Veterinaria } from './veterinaria.entity';

/**
 * La veterinaria como tienda/clínica dentro de la app: su catálogo, su horario
 * de atención y su agenda.
 *
 * Las rutas cuelgan de /veterinarias/:id/... y llevan siempre un segundo
 * segmento, así que no chocan con el @Get(':id') del directorio.
 */
@Controller('veterinarias')
export class VetStoreController {
  constructor(
    private readonly service: VetStoreService,
    @InjectRepository(Veterinaria)
    private readonly vets: Repository<Veterinaria>,
  ) {}

  // ---------------- Catálogo ----------------

  /** Público: lo que ve un cliente al entrar a la clínica. */
  @Get(':id/products')
  listarProductos(@Param('id', ParseIntPipe) id: number) {
    return this.service.listarProductos(id);
  }

  /** Del dueño: incluye lo desactivado para poder reactivarlo. */
  @Get(':id/products/manage')
  @UseGuards(JwtAuthGuard)
  listarProductosDelDueno(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.listarProductosDelDueno(
      id,
      req.user.userId,
      req.user.roles,
    );
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard)
  crearProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: any,
    @Req() req: any,
  ) {
    return this.service.crearProducto(
      id,
      datos,
      req.user.userId,
      req.user.roles,
    );
  }

  @Patch(':id/products/:productId')
  @UseGuards(JwtAuthGuard)
  editarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() datos: any,
    @Req() req: any,
  ) {
    return this.service.editarProducto(
      id,
      productId,
      datos,
      req.user.userId,
      req.user.roles,
    );
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard)
  borrarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    return this.service.borrarProducto(
      id,
      productId,
      req.user.userId,
      req.user.roles,
    );
  }

  // ---------------- Horario de atención ----------------

  /** Público: el cliente necesita ver cuándo abren. */
  @Get(':id/hours')
  listarHorario(@Param('id', ParseIntPipe) id: number) {
    return this.service.listarHorario(id);
  }

  @Put(':id/hours')
  @UseGuards(JwtAuthGuard)
  guardarHorario(
    @Param('id', ParseIntPipe) id: number,
    @Body() cuerpo: any,
    @Req() req: any,
  ) {
    const tramos = Array.isArray(cuerpo) ? cuerpo : cuerpo?.tramos;
    if (!Array.isArray(tramos)) {
      throw new BadRequestException(
        'Manda una lista de tramos: [{ weekday, opensAt, closesAt }]',
      );
    }
    return this.service.guardarHorario(
      id,
      tramos,
      req.user.userId,
      req.user.roles,
    );
  }

  // ---------------- Huecos libres ----------------

  /**
   * GET /veterinarias/:id/availability?date=AAAA-MM-DD
   * Turnos que quedan libres ese día, ya descontadas las citas de la app y las
   * horas ocupadas del sistema del veterinario. Público: hay que poder verlo
   * antes de decidir reservar.
   */
  @Get(':id/availability')
  huecosLibres(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Falta la fecha: ?date=AAAA-MM-DD');
    }
    return this.service.huecosLibres(id, date);
  }

  // ---------------- Agenda del sistema del veterinario ----------------

  /** Horas ocupadas de un rango, para que el vet vea su propia agenda. */
  @Get(':id/agenda/busy')
  @UseGuards(JwtAuthGuard)
  async listarOcupados(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const desde = from ? new Date(from) : new Date();
    const hasta = to
      ? new Date(to)
      : new Date(desde.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
      throw new BadRequestException('Fechas inválidas en from/to');
    }
    return this.service.listarOcupados(id, desde, hasta);
  }

  /**
   * El sistema del veterinario EMPUJA aquí sus horas ocupadas.
   * Se autentica con la cabecera X-Agenda-Key (una clave por veterinaria), para
   * que su sistema pueda hablar con la app sin necesidad de una sesión de usuario.
   */
  @Post(':id/agenda/busy')
  async recibirOcupados(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-agenda-key') clave: string,
    @Body() cuerpo: any,
  ) {
    const vet = await this.vets.findOne({ where: { id } });
    if (!vet) throw new BadRequestException('Veterinaria no encontrada');
    if (!vet.externalAgendaKey || clave !== vet.externalAgendaKey) {
      throw new ForbiddenException('Clave de agenda inválida');
    }

    const bloques = Array.isArray(cuerpo) ? cuerpo : cuerpo?.bloques;
    if (!Array.isArray(bloques)) {
      throw new BadRequestException(
        'Manda una lista: [{ startsAt, endsAt, title?, externalId? }]',
      );
    }
    return this.service.registrarOcupados(id, bloques);
  }

  /** Trae el calendario iCal configurado y lo vuelca en la agenda. */
  @Post(':id/agenda/sync')
  @UseGuards(JwtAuthGuard)
  sincronizar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.sincronizarAgenda(
      id,
      req.user.userId,
      req.user.roles,
    );
  }
}
