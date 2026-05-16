import { useAuth as useAuthFromContext } from './AuthContext';

/**
 * Hook do obsługi uwierzytelniania i autoryzacji.
 * Dostarcza informacje o użytkowniku, rolach i organizacjach (tenants).
 */
export const useAuth = () => {
  return useAuthFromContext();
};

export default useAuth;
