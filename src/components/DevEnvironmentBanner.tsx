import './DevEnvironmentBanner.css';

const IS_DEV_ENV = import.meta.env.VITE_APP_ENV === 'development';

/** A thin, unobtrusive banner shown only when VITE_APP_ENV=development, so a dev deployment is never mistaken for production. */
export function DevEnvironmentBanner() {
  if (!IS_DEV_ENV) return null;

  return (
    <div className="dev-env-banner" role="status">
      DEV • Mathletica
    </div>
  );
}
