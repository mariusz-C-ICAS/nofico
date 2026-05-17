// Single Firebase instance — re-exports from shared lib to avoid duplicate-app errors
export { default as app, auth, db } from '../../shared/lib/firebase';
