// validators/is-future-date.decorator.ts

import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { IsFutureDateConstraint } from '../common/custom-validators/is-future-date.validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsFutureDateConstraint,
    });
  };
}