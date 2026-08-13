import { useAuth } from '../../auth/AuthContext';
import { DeleteAccountPanel } from '../../components/DeleteAccountPanel';

export function CoordinatorAccount() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="page-title">Account profile</h1>
      <p className="page-lead">
        Signed in as <strong>{user?.fullName}</strong> ({user?.email}) · coordinator
      </p>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Your account</h2>
            <p>
              Needs you posted stay in the system if you delete your account; your name is cleared
              as the poster.
            </p>
          </div>
        </div>
        <div className="meta">
          <span className="chip">{user?.email}</span>
          <span className="chip">{user?.role}</span>
        </div>
      </section>

      <DeleteAccountPanel />
    </>
  );
}
