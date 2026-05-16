import { describe, it, expect } from 'vitest';
import {
  validateNIP, validateREGON, validatePESEL,
  validateIBAN, validateKRS, validatePostalCodePL,
} from '../services/validators';

describe('validateNIP', () => {
  it('valid NIP', () => expect(validateNIP('5260250274').valid).toBe(true));
  it('invalid checksum', () => expect(validateNIP('5260250275').valid).toBe(false));
  it('too short', () => expect(validateNIP('123').valid).toBe(false));
  it('accepts dashes', () => expect(validateNIP('526-025-02-74').valid).toBe(true));
});

describe('validatePESEL', () => {
  it('valid PESEL', () => expect(validatePESEL('44051401458').valid).toBe(true));
  it('invalid checksum', () => expect(validatePESEL('44051401459').valid).toBe(false));
  it('too short', () => expect(validatePESEL('12345').valid).toBe(false));
});

describe('validateREGON', () => {
  it('valid 9-digit REGON', () => expect(validateREGON('690239640').valid).toBe(true));
  it('invalid 9-digit REGON', () => expect(validateREGON('123456789').valid).toBe(false));
  it('wrong length', () => expect(validateREGON('12345').valid).toBe(false));
});

describe('validateIBAN', () => {
  it('valid PL IBAN', () => expect(validateIBAN('PL61109010140000071219812874').valid).toBe(true));
  it('invalid IBAN', () => expect(validateIBAN('PL00000000000000000000000000').valid).toBe(false));
  it('accepts spaces', () => expect(validateIBAN('PL 61 1090 1014 0000 0712 1981 2874').valid).toBe(true));
});

describe('validateKRS', () => {
  it('valid KRS', () => expect(validateKRS('0000000001').valid).toBe(true));
  it('too short', () => expect(validateKRS('123').valid).toBe(false));
});

describe('validatePostalCodePL', () => {
  it('valid', () => expect(validatePostalCodePL('00-001').valid).toBe(true));
  it('invalid format', () => expect(validatePostalCodePL('00001').valid).toBe(false));
});
