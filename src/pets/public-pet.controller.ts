import { Controller, Get, Header, Param } from '@nestjs/common';
import { PetProfileService } from './pet-profile.service';
import { Pet } from './pet.entity';

/**
 * Módulo 3 — Ficha pública de mascota (por QR). SIN autenticación.
 * Expone SOLO datos mínimos (nombre, foto, raza) + contacto. Nada médico.
 * Ruta: /api/p/:publicUid
 */
@Controller('p')
export class PublicPetController {
  constructor(private readonly service: PetProfileService) {}

  @Get(':publicUid')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async fiche(@Param('publicUid') publicUid: string): Promise<string> {
    const pet = await this.service.getPublicFiche(publicUid);
    if (!pet) return this.notFoundPage();
    return this.render(pet);
  }

  private esc(s: string | null | undefined): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private waLink(phone: string, name: string): string | null {
    let digits = (phone || '').replace(/[^0-9]/g, '');
    if (!digits) return null;
    if (digits.length === 9) digits = '51' + digits;
    const msg = encodeURIComponent(
      `Hola, encontré a ${name} y vi su ficha en PawFinder. ¿Es tuyo?`,
    );
    return `https://wa.me/${digits}?text=${msg}`;
  }

  private render(pet: Pet): string {
    const name = this.esc(pet.name);
    const breed = this.esc(pet.breed);
    const img = this.esc(pet.imageUrl);
    const wa = pet.contactPhone ? this.waLink(pet.contactPhone, pet.name) : null;
    const contactBtn = wa
      ? `<a class="btn" href="${wa}">💬 Contactar al dueño por WhatsApp</a>`
      : `<p class="muted">El dueño no dejó un contacto público.</p>`;
    const photo = img
      ? `<img class="photo" src="${img}" alt="${name}">`
      : `<div class="photo ph">🐾</div>`;
    return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} · PawFinder</title>
<style>
:root{--brand:#6C63FF}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f4fa;color:#1a1826;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:18px;max-width:380px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.08);overflow:hidden;text-align:center}
.photo{width:100%;height:280px;object-fit:cover;display:block}
.photo.ph{display:flex;align-items:center;justify-content:center;font-size:80px;background:#eee}
.body{padding:22px}
.tag{display:inline-block;background:var(--brand);color:#fff;font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;letter-spacing:.03em}
h1{margin:14px 0 2px;font-size:26px}
.breed{color:#666;margin:0 0 18px}
.btn{display:block;background:#25D366;color:#fff;text-decoration:none;font-weight:600;padding:14px;border-radius:12px;margin-top:8px}
.muted{color:#999;font-size:14px}
.foot{margin-top:18px;font-size:12px;color:#aaa}
</style></head><body>
<div class="card">
  ${photo}
  <div class="body">
    <span class="tag">🔍 ¿Me encontraste?</span>
    <h1>${name}</h1>
    <p class="breed">${breed || 'Mascota registrada en PawFinder'}</p>
    ${contactBtn}
    <p class="foot">Ficha pública de PawFinder · sin datos médicos ni personales.</p>
  </div>
</div></body></html>`;
  }

  private notFoundPage(): string {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>No encontrado · PawFinder</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f4fa;color:#555;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:20px}</style>
</head><body><div><div style="font-size:60px">🐾</div><h2>Ficha no encontrada</h2><p>Este código QR no corresponde a ninguna mascota registrada.</p></div></body></html>`;
  }
}
