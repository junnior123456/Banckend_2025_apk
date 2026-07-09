import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Valida un RUC peruano (SUNAT): 11 dígitos, prefijo de tipo válido y el
 * dígito verificador (módulo 11) correcto. No es solo "11 números".
 */
export function isValidRuc(value: string): boolean {
  if (typeof value !== 'string') return false;
  const ruc = value.trim();
  if (!/^\d{11}$/.test(ruc)) return false;

  // Prefijos válidos: 10 y 15 (persona natural), 16, 17, 20 (jurídica).
  const prefix = ruc.slice(0, 2);
  if (!['10', '15', '16', '17', '20'].includes(prefix)) return false;

  // Dígito verificador (módulo 11) sobre los 10 primeros dígitos.
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i], 10) * weights[i];
  }
  let check = 11 - (sum % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 1;
  return check === parseInt(ruc[10], 10);
}

@ValidatorConstraint({ name: 'isRuc', async: false })
export class IsRucConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidRuc(value);
  }
  defaultMessage(): string {
    return 'El RUC no es válido (deben ser 11 dígitos con dígito verificador correcto)';
  }
}

export function IsRuc(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsRucConstraint,
    });
  };
}
