import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import AuthCard from '../../components/layout/AuthCard.jsx';
import { ErrorBox, Loader, SuccessBox } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ status: token ? 'loading' : 'error', message: token ? '' : 'This verification link is incomplete.' });

  useEffect(() => {
    if (!token) return;
    api.post('/auth/verify-email', { token })
      .then(() => setState({ status: 'ok' }))
      .catch((e) => setState({ status: 'error', message: errMsg(e) }));
  }, [token]);

  return (
    <AuthCard title="Email verification" footer={<Link to="/" className="font-medium text-brand-600 hover:underline">Back to home</Link>}>
      {state.status === 'loading' && <Loader label="Verifying..." />}
      {state.status === 'ok' && <SuccessBox message="Your email address is verified. Thank you!" />}
      {state.status === 'error' && <ErrorBox message={state.message} />}
    </AuthCard>
  );
}
