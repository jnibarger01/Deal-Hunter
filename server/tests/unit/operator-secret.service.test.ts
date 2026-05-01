import config from '../../src/config/env';
import {
  decryptOperatorSecret,
  encryptOperatorSecret,
} from '../../src/services/operator-secret.service';

describe('operator secret service', () => {
  const originalOperatorSecretKey = config.operatorSecretKey;

  afterEach(() => {
    config.operatorSecretKey = originalOperatorSecretKey;
  });

  it('encrypts and decrypts operator secrets with the configured key', () => {
    config.operatorSecretKey = 'test-operator-secret-key';

    const encrypted = encryptOperatorSecret('sensitive-cookie-json');

    expect(encrypted).not.toBe('sensitive-cookie-json');
    expect(decryptOperatorSecret(encrypted)).toBe('sensitive-cookie-json');
  });

  it('throws when operator secret storage is not configured', () => {
    config.operatorSecretKey = undefined;

    expect(() => encryptOperatorSecret('value')).toThrow(
      'Operator secret storage is not configured'
    );
    expect(() => decryptOperatorSecret('value')).toThrow(
      'Operator secret storage is not configured'
    );
  });
});
