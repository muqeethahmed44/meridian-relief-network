type Props = {
  error?: string | null;
  success?: string | null;
  loading?: string | null;
};

export function FormStatus({ error, success, loading }: Props) {
  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="form-success" role="status">
        {success}
      </p>
    );
  }
  if (loading) {
    return (
      <p className="form-loading" role="status" aria-live="polite">
        {loading}
      </p>
    );
  }
  return null;
}

export function PageStatus({
  loading,
  error,
  empty,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string | null;
}) {
  if (loading) {
    return (
      <div className="status-block" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="status-block error" role="alert">
        <p>{error}</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="placeholder-box">
        <p className="muted">{empty}</p>
      </div>
    );
  }
  return null;
}
