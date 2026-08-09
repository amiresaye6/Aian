
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments): boolean {
    if (!value) return false;

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() > Date.now();
  }

  defaultMessage(args: ValidationArguments) {
    return 'startTime must be greater than the current time';
  }
}