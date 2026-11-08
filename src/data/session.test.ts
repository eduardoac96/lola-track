import { describe, it, expect } from 'vitest';
import { parseEmailLink } from './session';

describe('parseEmailLink', () => {
  it('lee token y tipo del link de Supabase', () => {
    expect(
      parseEmailLink('https://abc.supabase.co/auth/v1/verify?token=deadbeef&type=magiclink&redirect_to=https://x.dev'),
    ).toEqual({ tokenHash: 'deadbeef', type: 'magiclink' });
  });
  it('acepta texto alrededor y tipo signup', () => {
    expect(parseEmailLink('Sign in <https://abc.supabase.co/auth/v1/verify?token=abc123&type=signup>')).toEqual({
      tokenHash: 'abc123',
      type: 'signup',
    });
  });
  it('quita prefijo pkce_ y usa email como tipo por defecto', () => {
    expect(parseEmailLink('https://abc.supabase.co/auth/v1/verify?token=pkce_ff00')).toEqual({
      tokenHash: 'ff00',
      type: 'email',
    });
  });
  it('rechaza lo que no es link con token', () => {
    expect(parseEmailLink('123456')).toBeNull();
    expect(parseEmailLink('https://lola-track.pages.dev/')).toBeNull();
  });
});
