/**
 * Walidacja NIP (Numer Identyfikacji Podatkowej)
 * Sprawdza sumę kontrolną oraz format.
 */
export function validateNIP(nip: string): boolean {
  if (!nip) return false;
  
  // Usuń myślniki i spacje
  const cleanNIP = nip.replace(/[\s-]/g, "");
  
  if (cleanNIP.length !== 10) return false;
  if (!/^\d{10}$/.test(cleanNIP)) return false;
  
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNIP[i]) * weights[i];
  }
  
  const control = sum % 11;
  const lastDigit = parseInt(cleanNIP[9]);
  
  return control === lastDigit;
}

/**
 * Walidacja bezpiecznego hasła (prosta wersja przed zxcvbn)
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: "Hasło musi mieć co najmniej 8 znaków." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Hasło musi zawierać wielką literę." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Hasło musi zawierać małą literę." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Hasło musi zawierać cyfrę." };
  }
  return { isValid: true };
}
